'use client'

import * as React from 'react'
import { useThaiAddressAutocomplete } from 'thaizip/react'
import type { ResolvedThaiAddress, ThaiAddressSuggestion, TrigramIndex } from 'thaizip'
import { cn } from '@/lib/utils'
import { useThaiAddressIndex, type ThaiAddressIndexLoad } from '@/hooks/use-thai-address-index'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import { InputGroupAddon, InputGroupButton } from '@/components/ui/input-group'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

type AddressLocale = 'th' | 'en'

type ThaiAddressAutocompleteTexts = {
  placeholder: string
  clearAriaLabel: string
  loadingText: string
  errorText: string
  retryLabel: string
  emptyText: string
}

export type ThaiAddressAutocompleteProps = {
  /** Controlled resolved address. Pass `null` to clear a controlled input. */
  value?: ResolvedThaiAddress | null
  /** Uncontrolled seed value; pre-fills the input text via `initialQuery`. */
  defaultValue?: ResolvedThaiAddress | null
  onValueChange?: (address: ResolvedThaiAddress | null) => void
  /** When set, renders 4 hidden inputs: `${name}-subdistrict|-district|-province|-zipcode`. */
  name?: string
  /** Drives suggestion labels and the default texts. Defaults to `'th'`. */
  locale?: AddressLocale
  texts?: Partial<ThaiAddressAutocompleteTexts>
  /** Load the address data on mount, or when this field enters the viewport. */
  indexLoad?: ThaiAddressIndexLoad
  limit?: number
  debounce?: number
  threshold?: number
  disabled?: boolean
  required?: boolean
  onBlur?: React.FocusEventHandler<HTMLInputElement>
  onError?: (error: Error) => void
  'aria-invalid'?: React.AriaAttributes['aria-invalid']
  /** Applied to the root wrapper element. */
  className?: string
  inputClassName?: string
  popupClassName?: string
  itemClassName?: string
  /** Forwarded to the text input. */
  ref?: React.Ref<HTMLInputElement>
}

const DEFAULT_TEXTS: Record<AddressLocale, ThaiAddressAutocompleteTexts> = {
  th: {
    placeholder: 'พิมพ์ตำบล อำเภอ จังหวัด หรือรหัสไปรษณีย์',
    clearAriaLabel: 'ล้างที่อยู่',
    loadingText: 'กำลังโหลดข้อมูล...',
    errorText: 'โหลดข้อมูลที่อยู่ไม่สำเร็จ',
    retryLabel: 'ลองใหม่',
    emptyText: 'ไม่พบที่อยู่',
  },
  en: {
    placeholder: 'Type sub-district, district, province or postal code',
    clearAriaLabel: 'Clear address',
    loadingText: 'Loading address data...',
    errorText: 'Failed to load address data',
    retryLabel: 'Retry',
    emptyText: 'No address found',
  },
}

/** Mirrors thaizip's own label shape — see thai-address-autocomplete.tsx (vanilla) for the full rationale. */
function addressLabel(address: ResolvedThaiAddress, locale: AddressLocale): string {
  return locale === 'en'
    ? `${address.subdistrictEn} > ${address.districtEn} > ${address.provinceEn} ${address.zipCode}`
    : `${address.subdistrict} > ${address.district} > ${address.province} ${address.zipCode}`
}

export function ThaiAddressAutocomplete({
  indexLoad = 'mount',
  locale = 'th',
  texts,
  disabled = false,
  className,
  inputClassName,
  onError,
  ref,
  ...rest
}: ThaiAddressAutocompleteProps) {
  const resolvedTexts = React.useMemo<ThaiAddressAutocompleteTexts>(
    () => ({ ...DEFAULT_TEXTS[locale], ...texts }),
    [locale, texts],
  )

  const { index, error, retry, observe } = useThaiAddressIndex(indexLoad)

  React.useEffect(() => {
    if (error) onError?.(error)
  }, [error, onError])

  if (error) {
    return (
      <div
        role="alert"
        className={cn(
          'flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive',
          className,
        )}
      >
        <p>{resolvedTexts.errorText}</p>
        <Button variant="outline" onPress={retry}>
          {resolvedTexts.retryLabel}
        </Button>
      </div>
    )
  }

  // Deliberately NOT rendered until `index` is final and stable — same
  // rationale as the vanilla template (see its own comment).
  if (!index) {
    return (
      <div ref={observe} className={cn('relative w-full', className)}>
        <Input disabled aria-busy="true" placeholder={resolvedTexts.loadingText} className={inputClassName} />
      </div>
    )
  }

  return (
    <ThaiAddressAutocompleteReady
      {...rest}
      index={index}
      locale={locale}
      texts={resolvedTexts}
      disabled={disabled}
      className={className}
      inputClassName={inputClassName}
      ref={ref}
    />
  )
}

type ReadyProps = Omit<ThaiAddressAutocompleteProps, 'texts' | 'onError'> & {
  index: TrigramIndex
  locale: AddressLocale
  texts: ThaiAddressAutocompleteTexts
}

function ThaiAddressAutocompleteReady({
  index,
  value,
  defaultValue,
  onValueChange,
  name,
  locale,
  texts,
  limit,
  debounce,
  threshold,
  disabled = false,
  required = false,
  onBlur,
  'aria-invalid': ariaInvalid,
  className,
  inputClassName,
  popupClassName,
  itemClassName,
  ref,
}: ReadyProps) {
  const isControlled = value !== undefined

  const [internalResolved, setInternalResolved] = React.useState<ResolvedThaiAddress | null>(() =>
    isControlled ? null : (defaultValue ?? null),
  )
  const resolvedAddress = isControlled ? (value ?? null) : internalResolved

  const [initialQuery] = React.useState(() => {
    const seed = isControlled ? (value ?? null) : (defaultValue ?? null)
    return seed ? addressLabel(seed, locale) : ''
  })

  const { query, setQuery, setQuerySilent, suggestions, selectSuggestion, clear } = useThaiAddressAutocomplete({
    index,
    limit,
    debounce,
    threshold,
    locale,
    initialQuery,
  })

  // thaizip's ThaiAddressSuggestion.id is a string, so the lookup map — and
  // the onSelectionChange handler below — key on the raw string.
  const suggestionsById = React.useMemo(
    () => new Map(suggestions.map((item) => [item.id, item])),
    [suggestions],
  )

  React.useEffect(() => {
    if (!isControlled) return
    setQuerySilent(value ? addressLabel(value, locale) : '')
  }, [isControlled, value, locale, setQuerySilent])

  // The key RAC's ComboBox treats as selected — only ever the suggestion just
  // picked. RAC closes its popover when this changes; it has no controlled
  // open state of its own, so a ComboBox whose selectedKey never moves stays
  // open after a pick.
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null)

  function commitSelection(item: ThaiAddressSuggestion) {
    const result = selectSuggestion(item)
    if (!result) return
    setQuerySilent(item.label)
    setSelectedKey(item.id)
    if (!isControlled) setInternalResolved(result)
    onValueChange?.(result)
  }

  function handleQueryChange(nextValue: string) {
    // RAC echoes the picked item's textValue back through onInputChange once
    // selectedKey moves; commitSelection already set that text silently, so
    // re-running the search for it would only reopen the list.
    if (nextValue === query) return
    setQuery(nextValue)
    if (nextValue === '' && resolvedAddress !== null) {
      if (!isControlled) setInternalResolved(null)
      onValueChange?.(null)
    }
  }

  function handleClear() {
    clear()
    setSelectedKey(null)
    if (!isControlled) setInternalResolved(null)
    onValueChange?.(null)
  }

  return (
    <div className={cn('relative w-full', className)}>
      {/* `allowsCustomValue` keeps RAC from rewriting the input on blur to its
          selected item's text (or '' when the list has moved on) — the
          resolved address lives in this component, not in RAC's selection.
          `items` is passed, so RAC applies no filter on top of thaizip's. */}
      <Combobox
        items={suggestions}
        inputValue={query}
        onInputChange={handleQueryChange}
        selectedKey={selectedKey}
        onSelectionChange={(key) => {
          // `null` is RAC committing the typed text as a custom value — not a
          // clear of the resolved address, which only the input does.
          if (key == null) {
            setSelectedKey(null)
            return
          }
          // A stale key can arrive after `suggestions` moved on (a debounced
          // query landing mid-press) — look it up and no-op rather than throw.
          const item = suggestionsById.get(String(key))
          if (item) commitSelection(item)
        }}
        allowsCustomValue
        allowsEmptyCollection
        aria-label={texts.placeholder}
        isDisabled={disabled}
        isRequired={required}
        isInvalid={ariaInvalid === true || ariaInvalid === 'true'}
        // RAC validates `isRequired` itself by default and would block a
        // native form submit with its own message; leave that to the form.
        validationBehavior="aria"
      >
        <ComboboxInput
          ref={ref}
          placeholder={texts.placeholder}
          disabled={disabled}
          onBlur={onBlur}
          showTrigger={false}
          className={cn('w-full', inputClassName)}
        >
          {query.length > 0 && !disabled && (
            <InputGroupAddon align="inline-end">
              {/* `slot={null}` opts out of the ButtonContext ComboBox gives
                  every RAC Button inside it — without it this button would
                  become the popover toggle instead of clearing. */}
              <InputGroupButton
                slot={null}
                size="icon-xs"
                excludeFromTabOrder
                onPress={handleClear}
                aria-label={texts.clearAriaLabel}
              >
                ✕
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </ComboboxInput>

        <ComboboxContent className={popupClassName}>
          <ComboboxList<ThaiAddressSuggestion> renderEmptyState={() => <ComboboxEmpty>{texts.emptyText}</ComboboxEmpty>}>
            {(item) => (
              <ComboboxItem
                id={item.id}
                textValue={locale === 'en' ? item.labelEn : item.labelTh}
                className={cn('justify-between gap-3', itemClassName)}
              >
                <span className="truncate">{locale === 'en' ? item.labelEn : item.labelTh}</span>
                <span className="shrink-0 text-muted-foreground">{item.zipCode}</span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>

      {name && (
        <>
          <input
            type="hidden"
            name={`${name}-subdistrict`}
            value={resolvedAddress?.subdistrict ?? ''}
            disabled={disabled}
          />
          <input
            type="hidden"
            name={`${name}-district`}
            value={resolvedAddress?.district ?? ''}
            disabled={disabled}
          />
          <input
            type="hidden"
            name={`${name}-province`}
            value={resolvedAddress?.province ?? ''}
            disabled={disabled}
          />
          <input
            type="hidden"
            name={`${name}-zipcode`}
            value={resolvedAddress?.zipCode ?? ''}
            disabled={disabled}
          />
        </>
      )}
    </div>
  )
}

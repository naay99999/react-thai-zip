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
        <Button type="button" variant="outline" onClick={retry}>
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

  React.useEffect(() => {
    if (!isControlled) return
    setQuerySilent(value ? addressLabel(value, locale) : '')
  }, [isControlled, value, locale, setQuerySilent])

  function commitSelection(item: ThaiAddressSuggestion) {
    const result = selectSuggestion(item)
    if (!result) return
    setQuerySilent(item.label)
    if (!isControlled) setInternalResolved(result)
    onValueChange?.(result)
  }

  // shadcn's Combobox is Base UI's Combobox.Root, so the same synthetic
  // input-value writes the vanilla template guards against happen here too —
  // only `reason === 'input-change'` is real typing (see the vanilla
  // template's comment on this function for the full trace).
  function handleInputValueChange(nextValue: string, reason: string) {
    if (reason !== 'input-change') return

    setQuery(nextValue)
    if (nextValue === '' && resolvedAddress !== null) {
      if (!isControlled) setInternalResolved(null)
      onValueChange?.(null)
    }
  }

  function handleComboboxValueChange(item: ThaiAddressSuggestion | null) {
    // A mere close can report `null`; only a real press is a selection.
    if (item) commitSelection(item)
  }

  function handleClear() {
    clear()
    if (!isControlled) setInternalResolved(null)
    onValueChange?.(null)
  }

  return (
    <div className={cn('relative w-full', className)}>
      <Combobox<ThaiAddressSuggestion>
        items={suggestions}
        filter={null}
        inputValue={query}
        onInputValueChange={(nextValue, eventDetails) => handleInputValueChange(nextValue, eventDetails.reason)}
        onValueChange={handleComboboxValueChange}
        disabled={disabled}
      >
        <ComboboxInput
          ref={ref}
          placeholder={texts.placeholder}
          required={required}
          disabled={disabled}
          aria-invalid={ariaInvalid}
          onBlur={onBlur}
          showTrigger={false}
          className={cn('w-full', inputClassName)}
        >
          {query.length > 0 && !disabled && (
            // Not shadcn's `showClear`: Base UI's Combobox.Clear tracks its own
            // selected value, not "input has text" — same reason the vanilla
            // template uses a plain button.
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                tabIndex={-1}
                onMouseDown={(event) => event.preventDefault()}
                onClick={handleClear}
                aria-label={texts.clearAriaLabel}
              >
                ✕
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </ComboboxInput>

        <ComboboxContent className={popupClassName}>
          <ComboboxEmpty>{texts.emptyText}</ComboboxEmpty>
          <ComboboxList>
            {(item: ThaiAddressSuggestion) => (
              <ComboboxItem key={item.id} value={item} className={cn('justify-between gap-3', itemClassName)}>
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

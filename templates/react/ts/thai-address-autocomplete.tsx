'use client'

import * as React from 'react'
import { Combobox } from '@base-ui-components/react/combobox'
import { useThaiAddressAutocomplete } from 'thaizip/react'
import type { ResolvedThaiAddress, ThaiAddressSuggestion, TrigramIndex } from 'thaizip'
import { cn } from '@/lib/utils'
import { useThaiAddressIndex } from '@/hooks/use-thai-address-index'

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

/** A `TrigramIndex` shaped placeholder used only while the real index is loading. */
const EMPTY_INDEX: TrigramIndex = {
  map: new Map(),
  records: [],
  zipIndex: new Map(),
  normTambon: [],
  normTambonEn: [],
  byProvince: new Map(),
  byAmphure: new Map(),
}

/** Mirrors thaizip's own `${tambon} > ${amphure} > ${province} ${zipCode}` label shape. */
function addressLabel(address: ResolvedThaiAddress, locale: AddressLocale): string {
  return locale === 'en'
    ? `${address.subdistrictEn} > ${address.districtEn} > ${address.provinceEn} ${address.zipCode}`
    : `${address.subdistrict} > ${address.district} > ${address.province} ${address.zipCode}`
}

export function ThaiAddressAutocomplete({
  value,
  defaultValue,
  onValueChange,
  name,
  locale = 'th',
  texts,
  limit,
  debounce,
  threshold,
  disabled = false,
  required = false,
  onBlur,
  onError,
  'aria-invalid': ariaInvalid,
  className,
  inputClassName,
  popupClassName,
  itemClassName,
  ref,
}: ThaiAddressAutocompleteProps) {
  const resolvedTexts = React.useMemo<ThaiAddressAutocompleteTexts>(
    () => ({ ...DEFAULT_TEXTS[locale], ...texts }),
    [locale, texts],
  )

  const { index, error, isLoading, retry } = useThaiAddressIndex()

  React.useEffect(() => {
    if (error) onError?.(error)
  }, [error, onError])

  const isControlled = value !== undefined

  const [internalSelected, setInternalSelected] = React.useState<ResolvedThaiAddress | null>(defaultValue ?? null)
  const selected = isControlled ? (value ?? null) : internalSelected

  // Seed the input text once from whichever value is present on first render.
  const [initialQuery] = React.useState(() => {
    const seed = isControlled ? (value ?? null) : (defaultValue ?? null)
    return seed ? addressLabel(seed, locale) : ''
  })

  const { query, setQuery, setQuerySilent, suggestions, selectSuggestion, clear } = useThaiAddressAutocomplete({
    index: index ?? EMPTY_INDEX,
    limit,
    debounce,
    threshold,
    locale,
    initialQuery,
  })

  // Controlled mode: re-sync the visible text whenever the caller changes `value`.
  React.useEffect(() => {
    if (!isControlled) return
    setQuerySilent(value ? addressLabel(value, locale) : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isControlled, value, locale])

  function commitSelection(item: ThaiAddressSuggestion) {
    const result = selectSuggestion(item)
    if (!result) return
    setQuerySilent(addressLabel(result, locale))
    if (!isControlled) setInternalSelected(result)
    onValueChange?.(result)
  }

  function handleInputValueChange(nextValue: string) {
    setQuery(nextValue)
    if (nextValue === '' && selected !== null) {
      if (!isControlled) setInternalSelected(null)
      onValueChange?.(null)
    }
  }

  function handleComboboxValueChange(item: ThaiAddressSuggestion | null) {
    // Base UI can report a `null` value on escape/outside-press/blur — a mere close
    // must NOT clear the resolved selection, so only non-null presses are handled.
    if (item) commitSelection(item)
  }

  function handleClear() {
    clear()
    if (!isControlled) setInternalSelected(null)
    onValueChange?.(null)
  }

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
        <button
          type="button"
          onClick={retry}
          className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          {resolvedTexts.retryLabel}
        </button>
      </div>
    )
  }

  const isDisabled = disabled || isLoading

  return (
    <div className={cn('relative w-full', className)}>
      <Combobox.Root<ThaiAddressSuggestion>
        items={suggestions}
        filter={null}
        inputValue={query}
        onInputValueChange={handleInputValueChange}
        onValueChange={handleComboboxValueChange}
        disabled={isDisabled}
      >
        <div className="relative">
          <Combobox.Input
            ref={ref}
            required={required}
            disabled={isDisabled}
            aria-busy={isLoading || undefined}
            aria-invalid={ariaInvalid}
            onBlur={onBlur}
            placeholder={isLoading ? resolvedTexts.loadingText : resolvedTexts.placeholder}
            className={cn(
              'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 pr-8 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
              inputClassName,
            )}
          />

          {query.length > 0 && !isDisabled && (
            // A plain button, not `Combobox.Clear`: that part's built-in visibility tracks
            // Base UI's own internal selected-value state (which Base UI itself clears on
            // escape/outside-press), not "input has text" — the wrong semantics here since
            // a mere close must not hide the clear affordance while text remains.
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(event) => event.preventDefault()}
              onClick={handleClear}
              aria-label={resolvedTexts.clearAriaLabel}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring"
            >
              ✕
            </button>
          )}
        </div>

        <Combobox.Portal>
          <Combobox.Positioner sideOffset={4} className="z-50 outline-none">
            <Combobox.Popup
              className={cn(
                'max-h-64 w-[var(--anchor-width)] overflow-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md',
                popupClassName,
              )}
            >
              <Combobox.Empty className="px-2 py-4 text-center text-sm text-muted-foreground">
                {resolvedTexts.emptyText}
              </Combobox.Empty>
              <Combobox.List>
                {(item: ThaiAddressSuggestion) => (
                  <Combobox.Item
                    key={item.id}
                    value={item}
                    className={cn(
                      'flex cursor-default items-center justify-between gap-3 rounded-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
                      itemClassName,
                    )}
                  >
                    <span>{locale === 'en' ? item.labelEn : item.labelTh}</span>
                    <span className="shrink-0 text-muted-foreground">{item.zipCode}</span>
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>

      {name && (
        <>
          <input type="hidden" name={`${name}-subdistrict`} value={selected?.subdistrict ?? ''} />
          <input type="hidden" name={`${name}-district`} value={selected?.district ?? ''} />
          <input type="hidden" name={`${name}-province`} value={selected?.province ?? ''} />
          <input type="hidden" name={`${name}-zipcode`} value={selected?.zipCode ?? ''} />
        </>
      )}
    </div>
  )
}

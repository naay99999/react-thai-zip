'use client'

import * as React from 'react'
import { useThaiAddressAutocomplete } from 'thaizip/react'
import type { ResolvedThaiAddress, ThaiAddressSuggestion, TrigramIndex } from 'thaizip'
import { cn } from '@/lib/utils'
import { useThaiAddressIndex } from '@/hooks/use-thai-address-index'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Button, buttonVariants } from '@/components/ui/button'

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
  /**
   * Unlike the vanilla template, the always-visible surface here is the
   * trigger button (see the `ref` comment below), so this fires on the
   * button, not on `CommandInput` — hence `HTMLButtonElement`.
   */
  onBlur?: React.FocusEventHandler<HTMLButtonElement>
  onError?: (error: Error) => void
  'aria-invalid'?: React.AriaAttributes['aria-invalid']
  /** Applied to the root wrapper element. */
  className?: string
  inputClassName?: string
  popupClassName?: string
  itemClassName?: string
  /**
   * Forwarded to the search box rendered inside the popover (`CommandInput`).
   * Unlike the vanilla template, this element only exists in the DOM while
   * the popover is open — `ref.current` is `null` while closed.
   */
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

  const { index, error, retry } = useThaiAddressIndex()

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
      <div className={cn('relative w-full', className)}>
        <Button
          type="button"
          variant="outline"
          disabled
          aria-busy="true"
          className={cn('w-full justify-start font-normal', inputClassName)}
        >
          {resolvedTexts.loadingText}
        </Button>
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

  const [open, setOpen] = React.useState(false)

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
    setOpen(false)
  }

  function handleQueryChange(nextValue: string) {
    setQuery(nextValue)
    if (nextValue === '' && resolvedAddress !== null) {
      if (!isControlled) setInternalResolved(null)
      onValueChange?.(null)
    }
    if (!open) setOpen(true)
  }

  function handleClear() {
    clear()
    if (!isControlled) setInternalResolved(null)
    onValueChange?.(null)
    setOpen(false)
  }

  return (
    <div className={cn('relative w-full', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          type="button"
          disabled={disabled}
          aria-invalid={ariaInvalid}
          onBlur={onBlur}
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'w-full justify-between pr-8 font-normal',
            !query && 'text-muted-foreground',
            inputClassName,
          )}
        >
          <span className="truncate">{query || texts.placeholder}</span>
        </PopoverTrigger>

        {query.length > 0 && !disabled && (
          // A plain button, not part of the trigger — visible whenever there's text,
          // confirmed or not, same rule as the vanilla template's clear button.
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            tabIndex={-1}
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleClear}
            aria-label={texts.clearAriaLabel}
            className="absolute right-1 top-1/2 -translate-y-1/2"
          >
            ✕
          </Button>
        )}

        <PopoverContent align="start" className={cn('w-[var(--anchor-width)] p-0', popupClassName)}>
          <Command shouldFilter={false}>
            <CommandInput
              ref={ref}
              value={query}
              onValueChange={handleQueryChange}
              placeholder={texts.placeholder}
              required={required}
            />
            <CommandList>
              <CommandEmpty>{texts.emptyText}</CommandEmpty>
              <CommandGroup>
                {suggestions.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={String(item.id)}
                    onSelect={() => commitSelection(item)}
                    className={itemClassName}
                  >
                    <span className="flex-1 truncate">{locale === 'en' ? item.labelEn : item.labelTh}</span>
                    <span className="shrink-0 text-muted-foreground">{item.zipCode}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

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

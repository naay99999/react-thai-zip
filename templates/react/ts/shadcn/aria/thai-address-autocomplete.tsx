'use client'

import * as React from 'react'
import { useThaiAddressAutocomplete } from 'thaizip/react'
import type { ResolvedThaiAddress, ThaiAddressSuggestion, TrigramIndex } from 'thaizip'
import { cn } from '@/lib/utils'
import { useThaiAddressIndex } from '@/hooks/use-thai-address-index'
import { Popover, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
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
      <div className={cn('relative w-full', className)}>
        <Button
          variant="outline"
          isDisabled
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

  // thaizip's ThaiAddressSuggestion.id is a string (unlike the cascade
  // hook's numeric option ids), so the lookup map — and the CommandList
  // onAction handler below — key on the raw string, not `Number(key)`.
  const suggestionsById = React.useMemo(
    () => new Map(suggestions.map((item) => [item.id, item])),
    [suggestions],
  )

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

  // React Aria's Button (what the trigger below renders under the hood)
  // filters its DOM props through an explicit allowlist before spreading
  // them onto the real <button> — `aria-invalid` is not on that list, so
  // passing it as a normal prop is silently dropped before it ever reaches
  // the DOM (same gap the aria cascade select's SelectTrigger hits; see its
  // own comment for the verified trace through filterDOMProps). Base and
  // radix don't have this problem — their trigger is a thin wrapper around a
  // real button that forwards arbitrary aria-* props straight through. So
  // the only way to get a real `aria-invalid` attribute onto this engine's
  // trigger — for the shadcn fixture's own `aria-invalid:border-destructive`
  // Tailwind styling and for screen readers — is to set it on the DOM node
  // directly.
  const isInvalid = ariaInvalid === true || ariaInvalid === 'true'
  const internalTriggerRef = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    const node = internalTriggerRef.current
    if (!node) return
    if (isInvalid) node.setAttribute('aria-invalid', 'true')
    else node.removeAttribute('aria-invalid')
  }, [isInvalid])

  // See the comment at the CommandInput call site for why this indirection
  // is needed to forward the public `ref` prop to the actual input element.
  const setInputContainerRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      const input = node?.querySelector<HTMLInputElement>('[data-slot="command-input"]') ?? null
      if (typeof ref === 'function') ref(input)
      else if (ref) (ref as React.RefObject<HTMLInputElement | null>).current = input
    },
    [ref],
  )

  return (
    <div className={cn('relative w-full', className)}>
      {/* React Aria's DialogTrigger-based PopoverTrigger takes the trigger and
          the Popover as its two children, and the Popover *is* the content —
          there is no PopoverContent in the aria-backed shadcn registry. Width
          comes from RAC's own --trigger-width variable. */}
      <PopoverTrigger isOpen={open} onOpenChange={setOpen}>
        <Button
          ref={internalTriggerRef}
          variant="outline"
          isDisabled={disabled}
          // RAC's Button types onBlur against a generic `Element`, since the
          // fixture doesn't pin it to a specific host element — it renders a
          // real `<button>` at runtime, so this adapts the event back to the
          // `HTMLButtonElement` shape our own public prop promises. Same
          // pattern as the aria cascade select's SelectTrigger.
          onBlur={onBlur && ((event: React.FocusEvent<Element>) => onBlur(event as React.FocusEvent<HTMLButtonElement>))}
          className={cn(
            'w-full justify-between pr-8 font-normal',
            !query && 'text-muted-foreground',
            inputClassName,
          )}
        >
          <span className="truncate">{query || texts.placeholder}</span>
        </Button>

        <Popover placement="bottom start" className={cn('w-(--trigger-width) p-0', popupClassName)}>
          {/* aria's Command always applies a filter (`filter={props.filter || contains}`),
              and our suggestions arrive already filtered by thaizip — so an
              explicit pass-through filter is mandatory here, not optional.
              The query lives on the Autocomplete root as inputValue, not on
              CommandInput as it does in the cmdk-backed engines. */}
          <Command inputValue={query} onInputChange={handleQueryChange} filter={() => true}>
            {/* CommandInput's own prop type is bare `InputProps` (no
                `React.RefAttributes`) — unlike SelectTrigger in the aria
                cascade template, whose type comes through
                `ComponentProps<typeof ButtonPrimitive>` and does carry
                RefAttributes, so passing `ref` straight to CommandInput
                doesn't typecheck. Resolve the real `<input
                data-slot="command-input">` DOM node once React has mounted
                it instead: refs attach bottom-up during commit, so by the
                time this wrapper div's callback ref fires, the nested input
                already exists in the DOM. */}
            <div ref={setInputContainerRef}>
              <CommandInput placeholder={texts.placeholder} required={required} />
            </div>
            <CommandList onAction={(key) => commitSelection(suggestionsById.get(String(key))!)}>
              {suggestions.map((item) => (
                <CommandItem
                  key={item.id}
                  id={item.id}
                  textValue={locale === 'en' ? item.labelEn : item.labelTh}
                  className={itemClassName}
                >
                  <span className="flex-1 truncate">{locale === 'en' ? item.labelEn : item.labelTh}</span>
                  <span className="shrink-0 text-muted-foreground">{item.zipCode}</span>
                </CommandItem>
              ))}
            </CommandList>
            {suggestions.length === 0 && <CommandEmpty>{texts.emptyText}</CommandEmpty>}
          </Command>
        </Popover>
      </PopoverTrigger>

      {query.length > 0 && !disabled && (
        // A plain button, not part of the trigger — visible whenever there's text,
        // confirmed or not, same rule as the vanilla template's clear button. RAC
        // has no onMouseDown-preventDefault need because pressing does not steal
        // focus the way a native mousedown does.
        <Button
          variant="ghost"
          size="icon-sm"
          excludeFromTabOrder
          onPress={handleClear}
          aria-label={texts.clearAriaLabel}
          className="absolute right-1 top-1/2 -translate-y-1/2"
        >
          ✕
        </Button>
      )}

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

'use client'

import * as React from 'react'
import type { ResolvedThaiAddress, TrigramIndex } from 'thaizip'
import { cn } from '@/lib/utils'
import { useThaiAddressIndex } from '@/hooks/use-thai-address-index'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DEFAULT_CASCADE_TEXTS,
  optionName,
  useThaiAddressCascade,
  type AddressLocale,
  type CascadeOption,
  type ThaiAddressCascadeSelectTexts,
} from '@/hooks/use-thai-address-cascade'

export type { ThaiAddressCascadeSelectTexts }

// This file's filename and its `ThaiAddressCascadeSelect`/`ThaiAddressCascadeSelectTexts`
// export names are relied on by sibling templates (thai-address-form.tsx,
// thai-address-form-field.tsx) via plain relative imports that no tooling validates at
// scaffold time — renaming either requires updating those files too.
export type ThaiAddressCascadeSelectProps = {
  /** Controlled resolved address. Pass `null` to clear a controlled cascade. */
  value?: ResolvedThaiAddress | null
  /** Uncontrolled seed value; pre-selects the full province > district > subdistrict chain. */
  defaultValue?: ResolvedThaiAddress | null
  onValueChange?: (address: ResolvedThaiAddress | null) => void
  /** When set, renders 4 hidden inputs: `${name}-subdistrict|-district|-province|-zipcode`. */
  name?: string
  /** Drives option labels and the default texts. Defaults to `'th'`. */
  locale?: AddressLocale
  texts?: Partial<ThaiAddressCascadeSelectTexts>
  disabled?: boolean
  required?: boolean
  /** Blur handler for the province trigger (the cascade's primary control). */
  onBlur?: React.FocusEventHandler<HTMLButtonElement>
  onError?: (error: Error) => void
  /** Marks all three select triggers invalid (e.g. after failed form validation). */
  'aria-invalid'?: React.AriaAttributes['aria-invalid']
  /** Applied to the root grid wrapper element. */
  className?: string
  labelClassName?: string
  triggerClassName?: string
  popupClassName?: string
  itemClassName?: string
  /** Forwarded to the province trigger button (the cascade's primary control). */
  ref?: React.Ref<HTMLButtonElement>
}

export function ThaiAddressCascadeSelect({
  locale = 'th',
  texts,
  disabled = false,
  className,
  labelClassName,
  triggerClassName,
  onError,
  ref,
  ...rest
}: ThaiAddressCascadeSelectProps) {
  const resolvedTexts = React.useMemo<ThaiAddressCascadeSelectTexts>(
    () => ({ ...DEFAULT_CASCADE_TEXTS[locale], ...texts }),
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

  // Same rationale as thai-address-autocomplete.tsx: mount the index-consuming
  // subtree only once `index` is final and stable.
  if (!index) {
    return (
      <div aria-busy="true" className={cn('grid w-full grid-cols-1 gap-4 sm:grid-cols-2', className)}>
        {[resolvedTexts.provinceLabel, resolvedTexts.districtLabel, resolvedTexts.subdistrictLabel, resolvedTexts.zipLabel].map(
          (label) => (
            <div key={label} className="flex flex-col gap-1.5">
              <Label className={labelClassName}>{label}</Label>
              <Button variant="outline" isDisabled className={cn('w-full justify-start font-normal', triggerClassName)}>
                {resolvedTexts.loadingText}
              </Button>
            </div>
          ),
        )}
      </div>
    )
  }

  return (
    <ThaiAddressCascadeSelectReady
      {...rest}
      index={index}
      locale={locale}
      texts={resolvedTexts}
      disabled={disabled}
      className={className}
      labelClassName={labelClassName}
      triggerClassName={triggerClassName}
      ref={ref}
    />
  )
}

type ReadyProps = Omit<ThaiAddressCascadeSelectProps, 'texts' | 'onError'> & {
  index: TrigramIndex
  locale: AddressLocale
  texts: ThaiAddressCascadeSelectTexts
}

function ThaiAddressCascadeSelectReady({
  index,
  value,
  defaultValue,
  onValueChange,
  name,
  locale,
  texts,
  disabled = false,
  required = false,
  onBlur,
  'aria-invalid': ariaInvalid,
  className,
  labelClassName,
  triggerClassName,
  popupClassName,
  itemClassName,
  ref,
}: ReadyProps) {
  const id = React.useId()

  const {
    provinces,
    amphures,
    tambons,
    provinceId,
    amphureId,
    tambonId,
    resolvedAddress,
    zipCode: zipValue,
    setProvince: handleProvinceChange,
    setAmphure: handleAmphureChange,
    setTambon: handleTambonChange,
  } = useThaiAddressCascade({ index, value, defaultValue, onValueChange, locale })

  return (
    <div className={cn('grid w-full grid-cols-1 gap-4 sm:grid-cols-2', className)}>
      <CascadeField
        label={texts.provinceLabel}
        placeholder={texts.provincePlaceholder}
        options={provinces}
        value={provinceId}
        onChange={handleProvinceChange}
        disabled={disabled}
        required={required}
        locale={locale}
        triggerRef={ref}
        onBlur={onBlur}
        ariaInvalid={ariaInvalid}
        labelClassName={labelClassName}
        triggerClassName={triggerClassName}
        popupClassName={popupClassName}
        itemClassName={itemClassName}
      />
      <CascadeField
        label={texts.districtLabel}
        placeholder={texts.districtPlaceholder}
        options={amphures}
        value={amphureId}
        onChange={handleAmphureChange}
        disabled={disabled || provinceId === null}
        required={required}
        locale={locale}
        ariaInvalid={ariaInvalid}
        labelClassName={labelClassName}
        triggerClassName={triggerClassName}
        popupClassName={popupClassName}
        itemClassName={itemClassName}
      />
      <CascadeField
        label={texts.subdistrictLabel}
        placeholder={texts.subdistrictPlaceholder}
        options={tambons}
        value={tambonId}
        onChange={handleTambonChange}
        disabled={disabled || amphureId === null}
        required={required}
        locale={locale}
        ariaInvalid={ariaInvalid}
        labelClassName={labelClassName}
        triggerClassName={triggerClassName}
        popupClassName={popupClassName}
        itemClassName={itemClassName}
      />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-zip`} className={labelClassName}>
          {texts.zipLabel}
        </Label>
        <Input
          id={`${id}-zip`}
          readOnly
          tabIndex={-1}
          value={zipValue}
          className={cn('bg-muted text-muted-foreground', triggerClassName)}
        />
      </div>

      {name && (
        <>
          <input type="hidden" name={`${name}-subdistrict`} value={resolvedAddress?.subdistrict ?? ''} disabled={disabled} />
          <input type="hidden" name={`${name}-district`} value={resolvedAddress?.district ?? ''} disabled={disabled} />
          <input type="hidden" name={`${name}-province`} value={resolvedAddress?.province ?? ''} disabled={disabled} />
          <input type="hidden" name={`${name}-zipcode`} value={resolvedAddress?.zipCode ?? ''} disabled={disabled} />
        </>
      )}
    </div>
  )
}

type CascadeFieldProps = {
  label: string
  placeholder: string
  options: CascadeOption[]
  value: number | null
  onChange: (next: number | null) => void
  disabled: boolean
  required: boolean
  locale: AddressLocale
  triggerRef?: React.Ref<HTMLButtonElement>
  onBlur?: React.FocusEventHandler<HTMLButtonElement>
  ariaInvalid?: React.AriaAttributes['aria-invalid']
  labelClassName?: string
  triggerClassName?: string
  popupClassName?: string
  itemClassName?: string
}

function CascadeField({
  label,
  placeholder,
  options,
  value,
  onChange,
  disabled,
  required,
  locale,
  triggerRef,
  onBlur,
  ariaInvalid,
  labelClassName,
  triggerClassName,
  popupClassName,
  itemClassName,
}: CascadeFieldProps) {
  return (
    // React Aria keys list items by `id` (a Key = string | number), so the
    // numeric option ids go in and come back out unconverted — unlike the Base
    // UI and Radix copies of this file, which round-trip them through strings.
    // `selectedKey={null}` is RAC's native cleared state.
    <Select
      selectedKey={value}
      onSelectionChange={(key) => onChange(key === null ? null : Number(key))}
      isDisabled={disabled}
      isRequired={required}
      isInvalid={ariaInvalid === true || ariaInvalid === 'true'}
      placeholder={placeholder}
      className="flex w-full flex-col gap-1.5"
    >
      {/* RAC's Label associates with the Select through context — no htmlFor
          and no aria-labelledby needed. */}
      <Label className={labelClassName}>{label}</Label>
      {/* RAC's SelectTrigger types onBlur against a generic `Element`, since the
          fixture's Button wrapper is not pinned to a specific host element —
          it renders a real `<button>` at runtime, so this adapts the event
          back to the `HTMLButtonElement` shape our own public prop promises. */}
      <SelectTrigger
        ref={triggerRef}
        onBlur={onBlur && ((event: React.FocusEvent<Element>) => onBlur(event as React.FocusEvent<HTMLButtonElement>))}
        className={cn('w-full', triggerClassName)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className={popupClassName}>
        {options.map((option) => (
          <SelectItem
            key={option.id}
            id={option.id}
            textValue={optionName(option, locale)}
            className={itemClassName}
          >
            {optionName(option, locale)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

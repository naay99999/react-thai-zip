'use client'

import * as React from 'react'
import type { ResolvedThaiAddress } from 'thaizip'
import { cn } from '@/lib/utils'
// Plain same-directory relative import (shadcn-style file reuse, not an npm import) — both
// files land in the same componentDir at scaffold time. This file's filename and its
// `ThaiAddressCascadeSelect`/`ThaiAddressCascadeSelectTexts` export names are relied on by
// this import, and by thai-address-form-field.tsx's own import of the same file.
import { ThaiAddressCascadeSelect } from './thai-address-cascade-select'
import type { ThaiAddressCascadeSelectTexts } from './thai-address-cascade-select'

type AddressLocale = 'th' | 'en'

// No equivalent exists anywhere in the thaizip core package — confirmed no
// houseNo/moo/soi/street fields exist there. A structural superset of `ResolvedThaiAddress`,
// so it can be passed directly as `ThaiAddressCascadeSelect`'s `value`/`defaultValue` prop
// with no extraction step.
export type FullThaiAddress = ResolvedThaiAddress & {
  houseNo: string
  moo?: string
  soi?: string
  street?: string
}

export type ThaiAddressFormTexts = {
  houseNoLabel: string
  mooLabel: string
  soiLabel: string
  streetLabel: string
  houseNoPlaceholder: string
  mooPlaceholder: string
  soiPlaceholder: string
  streetPlaceholder: string
}

export type ThaiAddressFormProps = {
  /** Controlled resolved address. Pass `null` to clear a controlled form. */
  value?: FullThaiAddress | null
  /** Uncontrolled seed value; pre-fills the text fields and pre-selects the cascade. */
  defaultValue?: FullThaiAddress | null
  onValueChange?: (address: FullThaiAddress | null) => void
  /**
   * When set, forwarded to the embedded `ThaiAddressCascadeSelect` (which renders its own 4
   * hidden inputs: `${name}-subdistrict|-district|-province|-zipcode`), plus 4 more of this
   * component's own: `${name}-houseno|-moo|-soi|-street`.
   */
  name?: string
  /** Drives label texts (own and the embedded cascade's) and their defaults. Defaults to `'th'`. */
  locale?: AddressLocale
  texts?: Partial<ThaiAddressFormTexts>
  /** Forwarded as the embedded `ThaiAddressCascadeSelect`'s own `texts` prop. */
  cascadeTexts?: Partial<ThaiAddressCascadeSelectTexts>
  disabled?: boolean
  required?: boolean
  /** Blur handler for the house-number input specifically. */
  onBlur?: React.FocusEventHandler<HTMLInputElement>
  onError?: (error: Error) => void
  /** Marks the 4 text inputs and the embedded cascade's triggers invalid. */
  'aria-invalid'?: React.AriaAttributes['aria-invalid']
  /** Applied to the root wrapper element. */
  className?: string
  labelClassName?: string
  inputClassName?: string
  triggerClassName?: string
  popupClassName?: string
  itemClassName?: string
  /** Forwarded to the house-number `<input>`. */
  ref?: React.Ref<HTMLInputElement>
}

const DEFAULT_TEXTS: Record<AddressLocale, ThaiAddressFormTexts> = {
  th: {
    houseNoLabel: 'บ้านเลขที่',
    mooLabel: 'หมู่',
    soiLabel: 'ซอย',
    streetLabel: 'ถนน',
    houseNoPlaceholder: 'บ้านเลขที่',
    mooPlaceholder: 'หมู่',
    soiPlaceholder: 'ซอย',
    streetPlaceholder: 'ถนน',
  },
  en: {
    houseNoLabel: 'House number',
    mooLabel: 'Moo',
    soiLabel: 'Soi',
    streetLabel: 'Street',
    houseNoPlaceholder: 'House number',
    mooPlaceholder: 'Moo',
    soiPlaceholder: 'Soi',
    streetPlaceholder: 'Street',
  },
}

type TextFields = { houseNo: string; moo: string; soi: string; street: string }

/**
 * Merges the free-text fields with the cascade's latest resolution. Returns `null` unless
 * `houseNo` is non-blank AND the cascade currently has a full resolution — the "form is
 * usably complete" condition this component's own `onValueChange` is gated on.
 */
function computeFull(fields: TextFields, cascade: ResolvedThaiAddress | null): FullThaiAddress | null {
  const houseNo = fields.houseNo.trim()
  if (houseNo === '' || !cascade) return null
  return {
    ...cascade,
    houseNo,
    moo: fields.moo.trim() || undefined,
    soi: fields.soi.trim() || undefined,
    street: fields.street.trim() || undefined,
  }
}

export function ThaiAddressForm({
  value,
  defaultValue,
  onValueChange,
  name,
  locale = 'th',
  texts,
  cascadeTexts,
  disabled = false,
  required = false,
  onBlur,
  onError,
  'aria-invalid': ariaInvalid,
  className,
  labelClassName,
  inputClassName,
  triggerClassName,
  popupClassName,
  itemClassName,
  ref,
}: ThaiAddressFormProps) {
  const resolvedTexts = React.useMemo<ThaiAddressFormTexts>(
    () => ({ ...DEFAULT_TEXTS[locale], ...texts }),
    [locale, texts],
  )

  const isControlled = value !== undefined

  // The text fields' transient typing state is always local (in both controlled and
  // uncontrolled mode) — only the *combined* FullThaiAddress is controlled/uncontrolled.
  // Seeded once from whichever value is present on first render; deliberately not
  // re-synced from a later external `value` change (matches `ThaiAddressAutocomplete`'s
  // seed-once-then-local discipline for its own transient input state).
  const [houseNo, setHouseNo] = React.useState(() => (isControlled ? (value?.houseNo ?? '') : (defaultValue?.houseNo ?? '')))
  const [moo, setMoo] = React.useState(() => (isControlled ? (value?.moo ?? '') : (defaultValue?.moo ?? '')))
  const [soi, setSoi] = React.useState(() => (isControlled ? (value?.soi ?? '') : (defaultValue?.soi ?? '')))
  const [street, setStreet] = React.useState(() => (isControlled ? (value?.street ?? '') : (defaultValue?.street ?? '')))

  // The cascade's own resolution is always tracked locally, in both controlled and
  // uncontrolled mode — it's the only place this component remembers "what the cascade is
  // currently showing as selected". In controlled mode the combined FullThaiAddress may
  // legitimately be `null` while houseNo is still empty or the parent hasn't echoed a value
  // back yet; if `cascadeAddress` were derived from `value` alone, that `null` would erase a
  // cascade selection the user already made. `value` still wins whenever the parent has it
  // (so a deliberate external reset/replace is honored); it's only the fallback that changes.
  const [internalCascadeAddress, setInternalCascadeAddress] = React.useState<ResolvedThaiAddress | null>(() =>
    (isControlled ? value : defaultValue) ?? null,
  )
  const cascadeAddress: ResolvedThaiAddress | null = isControlled ? (value ?? internalCascadeAddress) : internalCascadeAddress

  const currentFields: TextFields = { houseNo, moo, soi, street }

  // Only actually calls onValueChange(null) when the merged value transitions away from a
  // previously-non-null state — same "don't fire spuriously" discipline as
  // thai-address-cascade-select.tsx / thai-address-autocomplete.tsx.
  function emitChange(nextFields: TextFields, cascade: ResolvedThaiAddress | null) {
    const wasNonNull = computeFull(currentFields, cascadeAddress) !== null
    const nextFull = computeFull(nextFields, cascade)
    if (nextFull !== null || wasNonNull) onValueChange?.(nextFull)
  }

  function handleHouseNoChange(next: string) {
    setHouseNo(next)
    emitChange({ ...currentFields, houseNo: next }, cascadeAddress)
  }

  function handleMooChange(next: string) {
    setMoo(next)
    emitChange({ ...currentFields, moo: next }, cascadeAddress)
  }

  function handleSoiChange(next: string) {
    setSoi(next)
    emitChange({ ...currentFields, soi: next }, cascadeAddress)
  }

  function handleStreetChange(next: string) {
    setStreet(next)
    emitChange({ ...currentFields, street: next }, cascadeAddress)
  }

  function handleCascadeChange(address: ResolvedThaiAddress | null) {
    setInternalCascadeAddress(address)
    emitChange(currentFields, address)
  }

  const id = React.useId()
  const cascadeControlledProps = isControlled ? { value: cascadeAddress } : { defaultValue }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <ThaiAddressCascadeSelect
        {...cascadeControlledProps}
        onValueChange={handleCascadeChange}
        name={name}
        locale={locale}
        texts={cascadeTexts}
        disabled={disabled}
        required={required}
        onError={onError}
        aria-invalid={ariaInvalid}
        labelClassName={labelClassName}
        triggerClassName={triggerClassName}
        popupClassName={popupClassName}
        itemClassName={itemClassName}
      />

      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id={`${id}-houseno`}
          label={resolvedTexts.houseNoLabel}
          placeholder={resolvedTexts.houseNoPlaceholder}
          value={houseNo}
          onChange={handleHouseNoChange}
          disabled={disabled}
          required={required}
          onBlur={onBlur}
          ariaInvalid={ariaInvalid}
          labelClassName={labelClassName}
          inputClassName={inputClassName}
          ref={ref}
        />
        <TextField
          id={`${id}-moo`}
          label={resolvedTexts.mooLabel}
          placeholder={resolvedTexts.mooPlaceholder}
          value={moo}
          onChange={handleMooChange}
          disabled={disabled}
          required={false}
          ariaInvalid={ariaInvalid}
          labelClassName={labelClassName}
          inputClassName={inputClassName}
        />
        <TextField
          id={`${id}-soi`}
          label={resolvedTexts.soiLabel}
          placeholder={resolvedTexts.soiPlaceholder}
          value={soi}
          onChange={handleSoiChange}
          disabled={disabled}
          required={false}
          ariaInvalid={ariaInvalid}
          labelClassName={labelClassName}
          inputClassName={inputClassName}
        />
        <TextField
          id={`${id}-street`}
          label={resolvedTexts.streetLabel}
          placeholder={resolvedTexts.streetPlaceholder}
          value={street}
          onChange={handleStreetChange}
          disabled={disabled}
          required={false}
          ariaInvalid={ariaInvalid}
          labelClassName={labelClassName}
          inputClassName={inputClassName}
        />
      </div>

      {name && (
        <>
          <input type="hidden" name={`${name}-houseno`} value={houseNo} disabled={disabled} />
          <input type="hidden" name={`${name}-moo`} value={moo} disabled={disabled} />
          <input type="hidden" name={`${name}-soi`} value={soi} disabled={disabled} />
          <input type="hidden" name={`${name}-street`} value={street} disabled={disabled} />
        </>
      )}
    </div>
  )
}

type TextFieldProps = {
  id: string
  label: string
  placeholder: string
  value: string
  onChange: (next: string) => void
  disabled: boolean
  required: boolean
  onBlur?: React.FocusEventHandler<HTMLInputElement>
  ariaInvalid?: React.AriaAttributes['aria-invalid']
  labelClassName?: string
  inputClassName?: string
  ref?: React.Ref<HTMLInputElement>
}

function TextField({
  id,
  label,
  placeholder,
  value,
  onChange,
  disabled,
  required,
  onBlur,
  ariaInvalid,
  labelClassName,
  inputClassName,
  ref,
}: TextFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={cn('text-sm font-medium text-foreground', labelClassName)}>
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        required={required}
        onBlur={onBlur}
        aria-invalid={ariaInvalid}
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          inputClassName,
        )}
      />
    </div>
  )
}

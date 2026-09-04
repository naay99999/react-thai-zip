'use client'

import * as React from 'react'
import { listAmphures, listProvinces, listTambons } from 'thaizip'
import type {
  AmphureSummary,
  ProvinceSummary,
  ResolvedThaiAddress,
  TambonSummary,
  TrigramIndex,
} from 'thaizip'
import { cn } from '@/lib/utils'
import { useThaiAddressIndex } from '@/hooks/use-thai-address-index'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type AddressLocale = 'th' | 'en'

// This file's filename and its `ThaiAddressCascadeSelect`/`ThaiAddressCascadeSelectTexts`
// export names are relied on by sibling templates (thai-address-form.tsx,
// thai-address-form-field.tsx) via plain relative imports that no tooling validates at
// scaffold time — renaming either requires updating those files too.
export type ThaiAddressCascadeSelectTexts = {
  provinceLabel: string
  districtLabel: string
  subdistrictLabel: string
  zipLabel: string
  provincePlaceholder: string
  districtPlaceholder: string
  subdistrictPlaceholder: string
  loadingText: string
  errorText: string
  retryLabel: string
}

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

const DEFAULT_TEXTS: Record<AddressLocale, ThaiAddressCascadeSelectTexts> = {
  th: {
    provinceLabel: 'จังหวัด',
    districtLabel: 'อำเภอ/เขต',
    subdistrictLabel: 'ตำบล/แขวง',
    zipLabel: 'รหัสไปรษณีย์',
    provincePlaceholder: 'เลือกจังหวัด',
    districtPlaceholder: 'เลือกอำเภอ/เขต',
    subdistrictPlaceholder: 'เลือกตำบล/แขวง',
    loadingText: 'กำลังโหลดข้อมูล...',
    errorText: 'โหลดข้อมูลที่อยู่ไม่สำเร็จ',
    retryLabel: 'ลองใหม่',
  },
  en: {
    provinceLabel: 'Province',
    districtLabel: 'District',
    subdistrictLabel: 'Sub-district',
    zipLabel: 'Postal code',
    provincePlaceholder: 'Select province',
    districtPlaceholder: 'Select district',
    subdistrictPlaceholder: 'Select sub-district',
    loadingText: 'Loading address data...',
    errorText: 'Failed to load address data',
    retryLabel: 'Retry',
  },
}

type Option = { id: number; nameTh: string; nameEn: string }

function optionName(option: Option, locale: AddressLocale): string {
  return locale === 'en' ? option.nameEn : option.nameTh
}

function buildResolved(
  province: ProvinceSummary,
  amphure: AmphureSummary,
  tambon: TambonSummary,
): ResolvedThaiAddress {
  return {
    tambon: tambon.nameTh,
    tambonEn: tambon.nameEn,
    amphure: amphure.nameTh,
    amphureEn: amphure.nameEn,
    province: province.nameTh,
    provinceEn: province.nameEn,
    zipCode: tambon.zipCode,
    subdistrict: tambon.nameTh,
    subdistrictEn: tambon.nameEn,
    district: amphure.nameTh,
    districtEn: amphure.nameEn,
    postalCode: tambon.zipCode,
  }
}

type SelectionIds = { provinceId: number | null; amphureId: number | null; tambonId: number | null }

const EMPTY_SELECTION: SelectionIds = { provinceId: null, amphureId: null, tambonId: null }

/**
 * Maps a `ResolvedThaiAddress` (names only — the type carries no ids) back onto
 * enumeration-API ids by exact Thai-name match down the chain. Returns the empty
 * selection when any link fails to match, so a stale/foreign address degrades to
 * an unselected cascade instead of a half-selected one.
 */
function selectionFromAddress(index: TrigramIndex, address: ResolvedThaiAddress | null): SelectionIds {
  if (!address) return EMPTY_SELECTION
  const province = listProvinces(index).find((entry) => entry.nameTh === address.province)
  if (!province) return EMPTY_SELECTION
  const amphure = listAmphures(index, province.id).find((entry) => entry.nameTh === address.district)
  if (!amphure) return EMPTY_SELECTION
  const tambon = listTambons(index, amphure.id).find((entry) => entry.nameTh === address.subdistrict)
  if (!tambon) return EMPTY_SELECTION
  return { provinceId: province.id, amphureId: amphure.id, tambonId: tambon.id }
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

  // Same rationale as thai-address-autocomplete.tsx: mount the index-consuming
  // subtree only once `index` is final and stable.
  if (!index) {
    return (
      <div aria-busy="true" className={cn('grid w-full grid-cols-1 gap-4 sm:grid-cols-2', className)}>
        {[resolvedTexts.provinceLabel, resolvedTexts.districtLabel, resolvedTexts.subdistrictLabel, resolvedTexts.zipLabel].map(
          (label) => (
            <div key={label} className="flex flex-col gap-1.5">
              <Label className={labelClassName}>{label}</Label>
              <Button type="button" variant="outline" disabled className={cn('w-full justify-start font-normal', triggerClassName)}>
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
  const isControlled = value !== undefined

  const [selection, setSelection] = React.useState<SelectionIds>(() =>
    selectionFromAddress(index, isControlled ? (value ?? null) : (defaultValue ?? null)),
  )
  const { provinceId, amphureId, tambonId } = selection

  // Controlled mode: re-map ids whenever the caller swaps `value` (including -> null).
  // Runs only on `value` identity changes, so in-progress partial picks (which never
  // emit a value) are not wiped between renders.
  React.useEffect(() => {
    if (!isControlled) return
    setSelection((current) => {
      if (value) return selectionFromAddress(index, value)
      // value === null: an external clear wipes a *full* local selection; a null
      // echoed back right after our own parent-change invalidation must not
      // reset the in-progress partial pick.
      return current.tambonId === null ? current : EMPTY_SELECTION
    })
  }, [isControlled, index, value])

  const provinces = React.useMemo(() => {
    const collator = new Intl.Collator(locale === 'en' ? 'en' : 'th')
    return [...listProvinces(index)].sort((a, b) => collator.compare(optionName(a, locale), optionName(b, locale)))
  }, [index, locale])
  const amphures = React.useMemo(() => {
    if (provinceId === null) return []
    const collator = new Intl.Collator(locale === 'en' ? 'en' : 'th')
    return [...listAmphures(index, provinceId)].sort((a, b) => collator.compare(optionName(a, locale), optionName(b, locale)))
  }, [index, provinceId, locale])
  const tambons = React.useMemo(() => {
    if (amphureId === null) return []
    const collator = new Intl.Collator(locale === 'en' ? 'en' : 'th')
    return [...listTambons(index, amphureId)].sort((a, b) => collator.compare(optionName(a, locale), optionName(b, locale)))
  }, [index, amphureId, locale])

  const selectedProvince = provinceId === null ? null : (provinces.find((entry) => entry.id === provinceId) ?? null)
  const selectedAmphure = amphureId === null ? null : (amphures.find((entry) => entry.id === amphureId) ?? null)
  const selectedTambon = tambonId === null ? null : (tambons.find((entry) => entry.id === tambonId) ?? null)

  const resolvedAddress: ResolvedThaiAddress | null = isControlled
    ? (value ?? null)
    : selectedProvince && selectedAmphure && selectedTambon
      ? buildResolved(selectedProvince, selectedAmphure, selectedTambon)
      : null

  const hadFullSelection = tambonId !== null

  function handleProvinceChange(nextId: number | null) {
    setSelection({ provinceId: nextId, amphureId: null, tambonId: null })
    if (hadFullSelection) onValueChange?.(null)
  }

  function handleAmphureChange(nextId: number | null) {
    setSelection((current) => ({ provinceId: current.provinceId, amphureId: nextId, tambonId: null }))
    if (hadFullSelection) onValueChange?.(null)
  }

  function handleTambonChange(nextId: number | null) {
    setSelection((current) => ({ ...current, tambonId: nextId }))
    if (nextId === null) {
      if (hadFullSelection) onValueChange?.(null)
      return
    }
    const tambon = tambons.find((entry) => entry.id === nextId)
    if (tambon && selectedProvince && selectedAmphure) {
      onValueChange?.(buildResolved(selectedProvince, selectedAmphure, tambon))
    }
  }

  const zipValue = selectedTambon?.zipCode ?? ''

  return (
    <div className={cn('grid w-full grid-cols-1 gap-4 sm:grid-cols-2', className)}>
      <CascadeField
        labelId={`${id}-province-label`}
        label={texts.provinceLabel}
        placeholder={texts.provincePlaceholder}
        options={provinces}
        value={provinceId}
        selected={selectedProvince}
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
        labelId={`${id}-district-label`}
        label={texts.districtLabel}
        placeholder={texts.districtPlaceholder}
        options={amphures}
        value={amphureId}
        selected={selectedAmphure}
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
        labelId={`${id}-subdistrict-label`}
        label={texts.subdistrictLabel}
        placeholder={texts.subdistrictPlaceholder}
        options={tambons}
        value={tambonId}
        selected={selectedTambon}
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
  labelId: string
  label: string
  placeholder: string
  options: Option[]
  value: number | null
  selected: Option | null
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
  labelId,
  label,
  placeholder,
  options,
  value,
  selected,
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
    <div className="flex flex-col gap-1.5">
      <Label id={labelId} className={labelClassName}>
        {label}
      </Label>
      {/* Option ids cross into the Select as strings (SelectItem's `value` is
          string-typed) and back out as numbers in onChange — see the design
          spec's "Cascade-select engine" note. `null` (unset) is passed through
          as-is: Select's underlying Base UI Root supports a `null` controlled
          value the same way the vanilla Base UI template does directly. */}
      <Select
        value={value === null ? null : String(value)}
        onValueChange={(next) => onChange(next === null ? null : Number(next))}
        disabled={disabled}
        required={required}
      >
        <SelectTrigger
          ref={triggerRef}
          aria-labelledby={labelId}
          aria-invalid={ariaInvalid}
          onBlur={onBlur}
          className={cn('w-full', triggerClassName)}
        >
          <SelectValue placeholder={placeholder}>{selected ? optionName(selected, locale) : undefined}</SelectValue>
        </SelectTrigger>
        <SelectContent className={popupClassName}>
          {options.map((option) => (
            <SelectItem key={option.id} value={String(option.id)} className={itemClassName}>
              {optionName(option, locale)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

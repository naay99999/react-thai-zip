'use client'

import * as React from 'react'
import type { ResolvedThaiAddress } from 'thaizip'
import { cn } from '@/lib/utils'

type AddressLocale = 'th' | 'en'

export type ThaiAddressDisplayValue = ResolvedThaiAddress & {
  houseNo?: string
  moo?: string
  soi?: string
  street?: string
}

export type ThaiAddressDisplayProps = {
  /** The address to render. `null` renders `emptyText` instead. */
  value: ThaiAddressDisplayValue | null
  /** Drives the locality label and the default `emptyText`. Defaults to `'th'`. */
  locale?: AddressLocale
  /** `'single-line'` (default) joins the street portion + locality with `', '`; `'multi-line'` renders them as two rows. */
  mode?: 'single-line' | 'multi-line'
  emptyText?: string
  /** Applied to the root `<address>` element. */
  className?: string
  /** Applied to each row's `<span>` in `'multi-line'` mode. */
  lineClassName?: string
  ref?: React.Ref<HTMLElement>
}

const DEFAULT_EMPTY_TEXT: Record<AddressLocale, string> = {
  th: 'ไม่มีที่อยู่',
  en: 'No address',
}

/**
 * Mirrors the `${subdistrict} > ${district} > ${province} ${zipCode}` label convention
 * used elsewhere in this repo (see `addressLabel()` in thai-address-autocomplete.tsx).
 */
function localityLabel(value: ThaiAddressDisplayValue, locale: AddressLocale): string {
  return locale === 'en'
    ? `${value.subdistrictEn} > ${value.districtEn} > ${value.provinceEn} ${value.zipCode}`
    : `${value.subdistrict} > ${value.district} > ${value.province} ${value.zipCode}`
}

/**
 * Composes the house-level portion from whichever of houseNo/moo/soi/street are present,
 * skipping each missing/empty segment (and its label word) entirely — never leaving a
 * stray separator behind. Returns `null` when none are present.
 */
function streetPortion(value: ThaiAddressDisplayValue): string | null {
  const parts: string[] = []
  if (value.houseNo) parts.push(value.houseNo)
  if (value.moo) parts.push(`หมู่ ${value.moo}`)
  if (value.soi) parts.push(`ซอย${value.soi}`)
  if (value.street) parts.push(value.street)
  return parts.length > 0 ? parts.join(' ') : null
}

export function ThaiAddressDisplay({
  value,
  locale = 'th',
  mode = 'single-line',
  emptyText,
  className,
  lineClassName,
  ref,
}: ThaiAddressDisplayProps) {
  const rootClassName = cn('text-sm', className)

  if (value === null) {
    return (
      <address ref={ref} className={rootClassName}>
        {emptyText ?? DEFAULT_EMPTY_TEXT[locale]}
      </address>
    )
  }

  const locality = localityLabel(value, locale)
  const street = streetPortion(value)

  if (mode === 'multi-line') {
    return (
      <address ref={ref} className={rootClassName}>
        {street && <span className={cn('block', lineClassName)}>{street}</span>}
        <span className={cn('block', lineClassName)}>{locality}</span>
      </address>
    )
  }

  return (
    <address ref={ref} className={rootClassName}>
      {street ? `${street}, ${locality}` : locality}
    </address>
  )
}

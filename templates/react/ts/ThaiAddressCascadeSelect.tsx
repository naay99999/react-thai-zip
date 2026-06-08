'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import { loadDefaultIndex } from 'thaizip/data'
import type { ThaiAddressRecord, TrigramIndex } from 'thaizip'

type Texts = {
  provinceLabel: string
  districtLabel: string
  subdistrictLabel: string
  postalCodeLabel: string
  selectProvinceOption: string
  selectDistrictOption: string
  selectSubdistrictOption: string
  loadingText: string
  errorText: string
}

const defaultTexts: Texts = {
  provinceLabel: 'Province',
  districtLabel: 'District',
  subdistrictLabel: 'Sub District',
  postalCodeLabel: 'Postal Code',
  selectProvinceOption: 'Select province',
  selectDistrictOption: 'Select district',
  selectSubdistrictOption: 'Select sub-district',
  loadingText: 'Loading...',
  errorText: 'Failed to load address data',
}

type Props = {
  texts?: Partial<Texts>
  onSelect?: (result: { province: string; district: string; subdistrict: string; postalCode: string }) => void
  onClear?: () => void
  containerClassName?: string
  fieldClassName?: string
  labelClassName?: string
  selectClassName?: string
  readOnlyInputClassName?: string
}

function joinClassNames(...classes: Array<string | undefined | false>): string {
  return classes.filter(Boolean).join(' ')
}

type ProvinceOption = { id: number; nameTh: string }
type DistrictOption = { id: number; nameTh: string }
type SubDistrictOption = { id: number; nameTh: string; zipCode: string }

export function ThaiAddressCascadeSelect({
  texts,
  onSelect,
  onClear,
  containerClassName,
  fieldClassName,
  labelClassName,
  selectClassName,
  readOnlyInputClassName,
}: Props) {
  const t: Texts = { ...defaultTexts, ...texts }
  const [index, setIndex] = useState<TrigramIndex | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    loadDefaultIndex()
      .then((nextIndex) => {
        if (active) setIndex(nextIndex)
      })
      .catch(() => {
        if (active) setError(t.errorText)
      })

    return () => {
      active = false
    }
  }, [])

  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
  if (!index) {
    return (
      <select
        className={joinClassNames(
          'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-500 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400',
          selectClassName,
        )}
        disabled
      >
        <option>{t.loadingText}</option>
      </select>
    )
  }

  return (
    <ThaiAddressCascadeSelectReady
      index={index}
      texts={t}
      onSelect={onSelect}
      onClear={onClear}
      containerClassName={containerClassName}
      fieldClassName={fieldClassName}
      labelClassName={labelClassName}
      selectClassName={selectClassName}
      readOnlyInputClassName={readOnlyInputClassName}
    />
  )
}

type ReadyProps = Omit<Props, 'texts'> & {
  index: TrigramIndex
  texts: Texts
}

function ThaiAddressCascadeSelectReady({
  index,
  texts,
  onSelect,
  onClear,
  containerClassName,
  fieldClassName,
  labelClassName,
  selectClassName,
  readOnlyInputClassName,
}: ReadyProps) {
  const id = useId()
  const provinces = useMemo(() => getUniqueProvinces(index.records), [index.records])
  const [provinceId, setProvinceId] = useState<number | null>(null)
  const [amphureId, setAmphureId] = useState<number | null>(null)
  const [tambonId, setTambonId] = useState<number | null>(null)
  const [zipCode, setZipCode] = useState('')

  const districts = useMemo(
    () => (provinceId !== null ? getDistrictsForProvince(index.records, provinceId) : []),
    [index.records, provinceId],
  )
  const subDistricts = useMemo(
    () => (amphureId !== null ? getSubDistrictsForDistrict(index.records, amphureId) : []),
    [index.records, amphureId],
  )

  function onProvinceChange(value: string) {
    setProvinceId(value ? Number(value) : null)
    setAmphureId(null)
    setTambonId(null)
    setZipCode('')
    onClear?.()
  }

  function onDistrictChange(value: string) {
    setAmphureId(value ? Number(value) : null)
    setTambonId(null)
    setZipCode('')
    onClear?.()
  }

  function onSubDistrictChange(value: string) {
    const id = value ? Number(value) : null
    setTambonId(id)
    if (id !== null) {
      const record = index.records.find((item) => item.tambonId === id)
      const zip = record?.zipCode ?? ''
      setZipCode(zip)
      if (record) {
        onSelect?.({
          province: record.provinceNameTh,
          district: record.amphureNameTh,
          subdistrict: record.tambonNameTh,
          postalCode: zip,
        })
      }
    } else {
      setZipCode('')
    }
  }

  const selectClass = joinClassNames(
    'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-slate-400 dark:focus:ring-slate-800',
    selectClassName,
  )
  const readOnlyClass = joinClassNames(
    'w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300',
    readOnlyInputClassName,
  )
  const labelClass = joinClassNames('text-sm font-semibold text-slate-900 dark:text-slate-100', labelClassName)

  return (
    <div className={joinClassNames('grid grid-cols-2 gap-4', containerClassName)}>
      <div className={joinClassNames('space-y-1', fieldClassName)}>
        <label htmlFor={`${id}-province`} className={labelClass}>{texts.provinceLabel}</label>
        <select id={`${id}-province`} className={selectClass} value={provinceId ?? ''} onChange={(event) => onProvinceChange(event.target.value)}>
          <option value="">{texts.selectProvinceOption}</option>
          {provinces.map((province) => <option key={province.id} value={province.id}>{province.nameTh}</option>)}
        </select>
      </div>

      <div className={joinClassNames('space-y-1', fieldClassName)}>
        <label htmlFor={`${id}-district`} className={labelClass}>{texts.districtLabel}</label>
        <select id={`${id}-district`} className={selectClass} value={amphureId ?? ''} onChange={(event) => onDistrictChange(event.target.value)} disabled={provinceId === null}>
          <option value="">{texts.selectDistrictOption}</option>
          {districts.map((district) => <option key={district.id} value={district.id}>{district.nameTh}</option>)}
        </select>
      </div>

      <div className={joinClassNames('space-y-1', fieldClassName)}>
        <label htmlFor={`${id}-subdistrict`} className={labelClass}>{texts.subdistrictLabel}</label>
        <select id={`${id}-subdistrict`} className={selectClass} value={tambonId ?? ''} onChange={(event) => onSubDistrictChange(event.target.value)} disabled={amphureId === null}>
          <option value="">{texts.selectSubdistrictOption}</option>
          {subDistricts.map((subDistrict) => <option key={subDistrict.id} value={subDistrict.id}>{subDistrict.nameTh}</option>)}
        </select>
      </div>

      <div className={joinClassNames('space-y-1', fieldClassName)}>
        <label htmlFor={`${id}-zip`} className={labelClass}>{texts.postalCodeLabel}</label>
        <input id={`${id}-zip`} className={readOnlyClass} value={zipCode} readOnly />
      </div>
    </div>
  )
}

function getUniqueProvinces(records: ThaiAddressRecord[]): ProvinceOption[] {
  const seen = new Map<number, ProvinceOption>()
  for (const record of records) {
    if (!seen.has(record.provinceId)) seen.set(record.provinceId, { id: record.provinceId, nameTh: record.provinceNameTh })
  }
  return Array.from(seen.values()).sort((a, b) => a.nameTh.localeCompare(b.nameTh, 'th'))
}

function getDistrictsForProvince(records: ThaiAddressRecord[], provinceId: number): DistrictOption[] {
  const seen = new Map<number, DistrictOption>()
  for (const record of records) {
    if (record.provinceId === provinceId && !seen.has(record.amphureId)) {
      seen.set(record.amphureId, { id: record.amphureId, nameTh: record.amphureNameTh })
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.nameTh.localeCompare(b.nameTh, 'th'))
}

function getSubDistrictsForDistrict(records: ThaiAddressRecord[], amphureId: number): SubDistrictOption[] {
  const seen = new Map<number, SubDistrictOption>()
  for (const record of records) {
    if (record.amphureId === amphureId && !seen.has(record.tambonId)) {
      seen.set(record.tambonId, { id: record.tambonId, nameTh: record.tambonNameTh, zipCode: record.zipCode })
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.nameTh.localeCompare(b.nameTh, 'th'))
}

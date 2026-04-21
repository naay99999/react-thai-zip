'use client'

import { useEffect, useMemo, useState } from 'react'
import { loadDefaultIndex } from 'thaizip/data'

export function ThaiAddressCascadeSelect({ onSelect }) {
  const [index, setIndex] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true

    loadDefaultIndex()
      .then((nextIndex) => {
        if (active) setIndex(nextIndex)
      })
      .catch(() => {
        if (active) setError('ไม่สามารถโหลดข้อมูลที่อยู่ได้')
      })

    return () => {
      active = false
    }
  }, [])

  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!index) return <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" disabled><option>กำลังโหลด...</option></select>

  return <ThaiAddressCascadeSelectReady index={index} onSelect={onSelect} />
}

function ThaiAddressCascadeSelectReady({ index, onSelect }) {
  const provinces = useMemo(() => getUniqueProvinces(index.records), [index.records])
  const [provinceId, setProvinceId] = useState(null)
  const [amphureId, setAmphureId] = useState(null)
  const [tambonId, setTambonId] = useState(null)
  const [zipCode, setZipCode] = useState('')

  const districts = useMemo(
    () => (provinceId !== null ? getDistrictsForProvince(index.records, provinceId) : []),
    [index.records, provinceId],
  )
  const subDistricts = useMemo(
    () => (amphureId !== null ? getSubDistrictsForDistrict(index.records, amphureId) : []),
    [index.records, amphureId],
  )

  function onProvinceChange(value) {
    setProvinceId(value ? Number(value) : null)
    setAmphureId(null)
    setTambonId(null)
    setZipCode('')
  }

  function onDistrictChange(value) {
    setAmphureId(value ? Number(value) : null)
    setTambonId(null)
    setZipCode('')
  }

  function onSubDistrictChange(value) {
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

  const selectClass = 'w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:opacity-40'

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-1">
        <label className="text-sm font-semibold">Province</label>
        <select className={selectClass} value={provinceId ?? ''} onChange={(event) => onProvinceChange(event.target.value)}>
          <option value="">Select province</option>
          {provinces.map((province) => <option key={province.id} value={province.id}>{province.nameTh}</option>)}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-semibold">District</label>
        <select className={selectClass} value={amphureId ?? ''} onChange={(event) => onDistrictChange(event.target.value)} disabled={provinceId === null}>
          <option value="">Select district</option>
          {districts.map((district) => <option key={district.id} value={district.id}>{district.nameTh}</option>)}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-semibold">Sub District</label>
        <select className={selectClass} value={tambonId ?? ''} onChange={(event) => onSubDistrictChange(event.target.value)} disabled={amphureId === null}>
          <option value="">Select sub district</option>
          {subDistricts.map((subDistrict) => <option key={subDistrict.id} value={subDistrict.id}>{subDistrict.nameTh}</option>)}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-semibold">Postal Code</label>
        <input className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 outline-none" value={zipCode} readOnly />
      </div>
    </div>
  )
}

function getUniqueProvinces(records) {
  const seen = new Map()
  for (const record of records) {
    if (!seen.has(record.provinceId)) seen.set(record.provinceId, { id: record.provinceId, nameTh: record.provinceNameTh })
  }
  return Array.from(seen.values()).sort((a, b) => a.nameTh.localeCompare(b.nameTh, 'th'))
}

function getDistrictsForProvince(records, provinceId) {
  const seen = new Map()
  for (const record of records) {
    if (record.provinceId === provinceId && !seen.has(record.amphureId)) {
      seen.set(record.amphureId, { id: record.amphureId, nameTh: record.amphureNameTh })
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.nameTh.localeCompare(b.nameTh, 'th'))
}

function getSubDistrictsForDistrict(records, amphureId) {
  const seen = new Map()
  for (const record of records) {
    if (record.amphureId === amphureId && !seen.has(record.tambonId)) {
      seen.set(record.tambonId, { id: record.tambonId, nameTh: record.tambonNameTh, zipCode: record.zipCode })
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.nameTh.localeCompare(b.nameTh, 'th'))
}

'use client'

import { useEffect, useState } from 'react'
import { loadDefaultIndex } from 'thaizip/data'
import { useThaiAddressAutocomplete } from 'thaizip'
import type { ResolvedThaiAddress, ThaiAddressSuggestion, TrigramIndex } from 'thaizip'

type Props = {
  onSelect?: (address: ResolvedThaiAddress) => void
  onClear?: () => void
}

export function ThaiAddressPostalCodeForm({ onSelect, onClear }: Props) {
  const [index, setIndex] = useState<TrigramIndex | null>(null)
  const [error, setError] = useState<string | null>(null)

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
  if (!index) return <input className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm" value="กำลังโหลด..." disabled readOnly />

  return <ThaiAddressPostalCodeFormReady index={index} onSelect={onSelect} onClear={onClear} />
}

type ReadyProps = Props & {
  index: TrigramIndex
}

function ThaiAddressPostalCodeFormReady({ index, onSelect, onClear }: ReadyProps) {
  const [address, setAddress] = useState<ResolvedThaiAddress | null>(null)
  const { query, setQuery, suggestions, isOpen, selectSuggestion, clear } = useThaiAddressAutocomplete({
    index,
    limit: 10,
    debounce: 200,
    threshold: 0.4,
  })

  function handleSelect(item: ThaiAddressSuggestion) {
    const resolved = selectSuggestion(item)
    setAddress(resolved)
    onSelect?.(resolved)
  }

  function handleClear() {
    clear()
    setAddress(null)
    onClear?.()
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="relative space-y-1">
          <label className="text-sm font-semibold">Postal Code</label>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            value={query}
            onChange={(event) => {
              setAddress(null)
              setQuery(event.target.value)
            }}
            placeholder="10110"
          />
          {isOpen && (
            <ul className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg">
              {suggestions.map((item) => (
                <li key={item.id}>
                  <button type="button" className="block w-full px-3 py-2 text-left hover:bg-slate-100" onClick={() => handleSelect(item)}>
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-semibold">Sub District</label>
          <input className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 outline-none" value={address?.subdistrict ?? ''} readOnly />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-semibold">District</label>
          <input className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 outline-none" value={address?.district ?? ''} readOnly />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-semibold">Province</label>
          <input className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 outline-none" value={address?.province ?? ''} readOnly />
        </div>
      </div>

      {query && (
        <button type="button" className="text-sm text-slate-500 hover:text-slate-900" onClick={handleClear}>
          Clear
        </button>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { loadDefaultIndex } from 'thaizip/data'
import { useThaiAddressAutocomplete } from 'thaizip'

function joinClassNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function ThaiAddressAutocomplete({
  placeholder = 'พิมพ์ตำบล อำเภอ จังหวัด หรือรหัสไปรษณีย์',
  onSelect,
  onClear,
  containerClassName,
  inputClassName,
  dropdownClassName,
  itemClassName,
}) {
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

  if (error) {
    return (
      <div className={joinClassNames('rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700', containerClassName)}>
        {error}
      </div>
    )
  }

  if (!index) {
    return (
      <div className={joinClassNames('relative w-full', containerClassName)}>
        <input
          className={joinClassNames(
            'w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500',
            inputClassName,
          )}
          value="กำลังโหลด..."
          disabled
          readOnly
        />
      </div>
    )
  }

  return (
    <ThaiAddressAutocompleteReady
      index={index}
      placeholder={placeholder}
      onSelect={onSelect}
      onClear={onClear}
      containerClassName={containerClassName}
      inputClassName={inputClassName}
      dropdownClassName={dropdownClassName}
      itemClassName={itemClassName}
    />
  )
}

function ThaiAddressAutocompleteReady({
  index,
  placeholder,
  onSelect,
  onClear,
  containerClassName,
  inputClassName,
  dropdownClassName,
  itemClassName,
}) {
  const { query, setQuery, suggestions, isOpen, selectSuggestion, clear } = useThaiAddressAutocomplete({
    index,
    limit: 10,
    debounce: 200,
    threshold: 0.4,
  })

  function handleSelect(item) {
    const resolved = selectSuggestion(item)
    setQuery(item.label)
    onSelect?.(resolved)
  }

  function handleClear() {
    clear()
    onClear?.()
  }

  return (
    <div className={joinClassNames('relative w-full', containerClassName)}>
      <div className="relative">
        <input
          className={joinClassNames(
            'w-full rounded-md border border-slate-300 bg-white px-3 py-2 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200',
            inputClassName,
          )}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
        />

        {query.length > 0 && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-sm text-slate-500 hover:text-slate-900"
            onClick={handleClear}
            aria-label="Clear address"
          >
            x
          </button>
        )}
      </div>

      {isOpen && (
        <ul
          className={joinClassNames(
            'absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg',
            dropdownClassName,
          )}
        >
          {suggestions.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={joinClassNames(
                  'block w-full px-3 py-2 text-left text-slate-900 hover:bg-slate-100',
                  itemClassName,
                )}
                onClick={() => handleSelect(item)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

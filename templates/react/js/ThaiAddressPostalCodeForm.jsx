'use client'

import { useEffect, useId, useState } from 'react'
import { loadDefaultIndex } from 'thaizip/data'
import { useThaiAddressAutocomplete } from 'thaizip/react'

const defaultTexts = {
  postalCodeLabel: 'Postal Code',
  subdistrictLabel: 'Sub District',
  districtLabel: 'District',
  provinceLabel: 'Province',
  postalCodePlaceholder: '10110',
  clearLabel: 'Clear',
  loadingText: 'Loading...',
  errorText: 'Failed to load address data',
}

function joinClassNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function ThaiAddressPostalCodeForm({
  texts,
  onSelect,
  onClear,
  containerClassName,
  fieldClassName,
  labelClassName,
  inputClassName,
  readOnlyInputClassName,
  dropdownClassName,
  itemClassName,
  clearButtonClassName,
}) {
  const t = { ...defaultTexts, ...texts }
  const [index, setIndex] = useState(null)
  const [error, setError] = useState(null)

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
      <input
        className={joinClassNames(
          'w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400',
          inputClassName,
        )}
        value={t.loadingText}
        disabled
        readOnly
      />
    )
  }

  return (
    <ThaiAddressPostalCodeFormReady
      index={index}
      texts={t}
      onSelect={onSelect}
      onClear={onClear}
      containerClassName={containerClassName}
      fieldClassName={fieldClassName}
      labelClassName={labelClassName}
      inputClassName={inputClassName}
      readOnlyInputClassName={readOnlyInputClassName}
      dropdownClassName={dropdownClassName}
      itemClassName={itemClassName}
      clearButtonClassName={clearButtonClassName}
    />
  )
}

function ThaiAddressPostalCodeFormReady({
  index,
  texts,
  onSelect,
  onClear,
  containerClassName,
  fieldClassName,
  labelClassName,
  inputClassName,
  readOnlyInputClassName,
  dropdownClassName,
  itemClassName,
  clearButtonClassName,
}) {
  const [address, setAddress] = useState(null)
  const [activeIndex, setActiveIndex] = useState(-1)
  const id = useId()
  const listboxId = `${id}-listbox`

  const { query, setQuery, suggestions, isOpen, selectSuggestion, clear } = useThaiAddressAutocomplete({
    index,
    limit: 10,
    debounce: 200,
    threshold: 0.4,
  })

  useEffect(() => { setActiveIndex(-1) }, [suggestions])

  function handleSelect(item) {
    const resolved = selectSuggestion(item)
    // thaizip >=0.7.0 returns null for a stale suggestion instead of throwing
    if (!resolved) return
    setAddress(resolved)
    onSelect?.(resolved)
  }

  function handleClear() {
    clear()
    setAddress(null)
    onClear?.()
  }

  function handleKeyDown(event) {
    if (!isOpen) return
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
        break
      case 'Enter':
        if (activeIndex >= 0 && suggestions[activeIndex]) {
          event.preventDefault()
          handleSelect(suggestions[activeIndex])
        }
        break
      case 'Escape':
        event.preventDefault()
        handleClear()
        break
    }
  }

  const activeOptionId =
    activeIndex >= 0 && suggestions[activeIndex]
      ? `${listboxId}-option-${suggestions[activeIndex].id}`
      : undefined

  const textInputClass = joinClassNames(
    'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:border-slate-400 dark:focus:ring-slate-800',
    inputClassName,
  )
  const readOnlyClass = joinClassNames(
    'w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300',
    readOnlyInputClassName,
  )
  const labelClass = joinClassNames('text-sm font-semibold text-slate-900 dark:text-slate-100', labelClassName)

  return (
    <div className={joinClassNames('space-y-4', containerClassName)}>
      <div className="grid grid-cols-2 gap-4">
        <div className={joinClassNames('relative space-y-1', fieldClassName)}>
          <label htmlFor={`${id}-zip`} className={labelClass}>{texts.postalCodeLabel}</label>
          <input
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-activedescendant={activeOptionId}
            id={`${id}-zip`}
            className={textInputClass}
            value={query}
            onChange={(event) => {
              setAddress(null)
              setQuery(event.target.value)
            }}
            onKeyDown={handleKeyDown}
            placeholder={texts.postalCodePlaceholder}
          />
          {isOpen && (
            <ul
              role="listbox"
              id={listboxId}
              className={joinClassNames('absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-950', dropdownClassName)}
            >
              {suggestions.map((item, i) => (
                <li
                  key={item.id}
                  id={`${listboxId}-option-${item.id}`}
                  role="option"
                  aria-selected={i === activeIndex}
                  className={joinClassNames(
                    'cursor-pointer px-3 py-2 text-slate-900 dark:text-slate-50',
                    i === activeIndex ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-100 dark:hover:bg-slate-800',
                    itemClassName,
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(item)}
                >
                  {item.label}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={joinClassNames('space-y-1', fieldClassName)}>
          <label htmlFor={`${id}-subdistrict`} className={labelClass}>{texts.subdistrictLabel}</label>
          <input id={`${id}-subdistrict`} className={readOnlyClass} value={address?.subdistrict ?? ''} readOnly />
        </div>

        <div className={joinClassNames('space-y-1', fieldClassName)}>
          <label htmlFor={`${id}-district`} className={labelClass}>{texts.districtLabel}</label>
          <input id={`${id}-district`} className={readOnlyClass} value={address?.district ?? ''} readOnly />
        </div>

        <div className={joinClassNames('space-y-1', fieldClassName)}>
          <label htmlFor={`${id}-province`} className={labelClass}>{texts.provinceLabel}</label>
          <input id={`${id}-province`} className={readOnlyClass} value={address?.province ?? ''} readOnly />
        </div>
      </div>

      {query && (
        <button
          type="button"
          className={joinClassNames('text-sm text-slate-500 transition hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:text-slate-400 dark:hover:text-slate-100 dark:focus:ring-slate-800', clearButtonClassName)}
          onClick={handleClear}
        >
          {texts.clearLabel}
        </button>
      )}
    </div>
  )
}

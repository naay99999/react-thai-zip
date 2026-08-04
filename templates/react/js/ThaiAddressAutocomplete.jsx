'use client'

import { useEffect, useId, useState } from 'react'
import { loadDefaultIndex } from 'thaizip/data'
import { useThaiAddressAutocomplete } from 'thaizip/react'

const defaultTexts = {
  placeholder: 'Type sub-district, district, province or postal code',
  clearAriaLabel: 'Clear address',
  loadingText: 'Loading...',
  errorText: 'Failed to load address data',
}

function joinClassNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function ThaiAddressAutocomplete({
  texts,
  onSelect,
  onClear,
  containerClassName,
  inputClassName,
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

  if (error) {
    return (
      <div className={joinClassNames('rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300', containerClassName)}>
        {error}
      </div>
    )
  }

  if (!index) {
    return (
      <div className={joinClassNames('relative w-full', containerClassName)}>
        <input
          className={joinClassNames(
            'w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400',
            inputClassName,
          )}
          value={t.loadingText}
          disabled
          readOnly
        />
      </div>
    )
  }

  return (
    <ThaiAddressAutocompleteReady
      index={index}
      texts={t}
      onSelect={onSelect}
      onClear={onClear}
      containerClassName={containerClassName}
      inputClassName={inputClassName}
      dropdownClassName={dropdownClassName}
      itemClassName={itemClassName}
      clearButtonClassName={clearButtonClassName}
    />
  )
}

function ThaiAddressAutocompleteReady({
  index,
  texts,
  onSelect,
  onClear,
  containerClassName,
  inputClassName,
  dropdownClassName,
  itemClassName,
  clearButtonClassName,
}) {
  const listboxId = useId()
  const [displayValue, setDisplayValue] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)

  const { query, setQuery, suggestions, isOpen, selectSuggestion, clear } = useThaiAddressAutocomplete({
    index,
    limit: 10,
    debounce: 200,
    threshold: 0.4,
  })

  useEffect(() => { setActiveIndex(-1) }, [suggestions])

  const inputValue = displayValue || query
  const showClear = inputValue.length > 0

  function handleSelect(item) {
    const resolved = selectSuggestion(item)
    // thaizip >=0.7.0 returns null for a stale suggestion instead of throwing
    if (!resolved) return
    setDisplayValue(item.label)
    clear()
    onSelect?.(resolved)
  }

  function handleClear() {
    clear()
    setDisplayValue('')
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

  return (
    <div className={joinClassNames('relative w-full', containerClassName)}>
      <div className="relative">
        <input
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={activeOptionId}
          className={joinClassNames(
            'w-full rounded-md border border-slate-300 bg-white px-3 py-2 pr-10 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:border-slate-400 dark:focus:ring-slate-800',
            inputClassName,
          )}
          value={inputValue}
          onChange={(event) => {
            setDisplayValue('')
            setQuery(event.target.value)
          }}
          onKeyDown={handleKeyDown}
          placeholder={texts.placeholder}
        />

        {showClear && (
          <button
            type="button"
            className={joinClassNames(
              'absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-sm text-slate-500 transition hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:text-slate-400 dark:hover:text-slate-100 dark:focus:ring-slate-800',
              clearButtonClassName,
            )}
            onClick={handleClear}
            aria-label={texts.clearAriaLabel}
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && (
        <ul
          role="listbox"
          id={listboxId}
          className={joinClassNames(
            'absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-950',
            dropdownClassName,
          )}
        >
          {suggestions.map((item, index) => (
            <li
              key={item.id}
              id={`${listboxId}-option-${item.id}`}
              role="option"
              aria-selected={index === activeIndex}
              className={joinClassNames(
                'cursor-pointer px-3 py-2 text-slate-900 dark:text-slate-50',
                index === activeIndex ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-100 dark:hover:bg-slate-800',
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
  )
}

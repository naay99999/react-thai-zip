import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import type { ResolvedThaiAddress } from 'thaizip'

export type AutocompleteBehaviourOptions = {
  /** Label for the describe block, e.g. 'radix'. */
  engine: string
  Component: React.ComponentType<{
    value?: ResolvedThaiAddress | null
    defaultValue?: ResolvedThaiAddress | null
    onValueChange?: (address: ResolvedThaiAddress | null) => void
    name?: string
    locale?: 'th' | 'en'
  }>
  /**
   * Opens the popup and types `query` into the search field. Base UI's and
   * Radix's shadcn `Command` renders a cmdk input with `role="combobox"`
   * inside a popup opened by a `role="button"` trigger; a future React Aria
   * variant exposes a `role="searchbox"` SearchField instead (RAC's `Command`
   * is a `SearchField`, not a combobox). So the whole open+type sequence —
   * trigger lookup included — is delegated to each engine's own test file
   * rather than hardcoded here.
   */
  openAndType: (query: string) => Promise<void>
  /**
   * Finds the suggestion whose rendered label matches `labelPattern` and
   * selects it. cmdk's `CommandItem` renders `role="option"`; a future React
   * Aria `MenuItem` may not expose the same role, so this lookup lives with
   * each engine's test file too — the shared helper never queries for
   * `role="option"` directly.
   */
  pickSuggestion: (labelPattern: RegExp) => Promise<void>
  /** Clicks the "clear address" control. */
  clickClear: () => Promise<void>
  /**
   * Asserts the trigger's accessible name matches `pattern` — used both right
   * after a selection (the resolved address label) and after clearing (back
   * to the placeholder). Each engine supplies its own trigger lookup here,
   * for the same reason as `openAndType`.
   */
  expectTriggerLabel: (pattern: RegExp) => Promise<void>
  /** The fixture chain, resolved once in the caller's beforeAll. */
  chain: () => {
    /** A short substring of the sample record's sub-district name to type. */
    query: string
    /** Matches the sample record's sub-district name wherever it's rendered. */
    labelPattern: RegExp
    zipCode: string
  }
}

export function describeAutocompleteBehaviour(options: AutocompleteBehaviourOptions): void {
  const { engine, Component, openAndType, pickSuggestion, clickClear, expectTriggerLabel, chain } = options

  describe(`ThaiAddressAutocomplete (${engine}) — shared behaviour`, () => {
    it('opens the popup on trigger click and lets the user pick a suggestion by typing', async () => {
      const onValueChange = vi.fn()
      render(<Component onValueChange={onValueChange} />)
      const { query, labelPattern, zipCode } = chain()

      await openAndType(query)
      await pickSuggestion(labelPattern)

      await waitFor(() => expect(onValueChange).toHaveBeenCalled())
      const [address] = onValueChange.mock.calls.at(-1)!
      expect(address.zipCode).toBe(zipCode)
      // The trigger's visible/accessible text should now reflect the resolved
      // address rather than the placeholder.
      await expectTriggerLabel(labelPattern)
    })

    it('clears the resolved address and query when the clear control is pressed', async () => {
      const onValueChange = vi.fn()
      render(<Component onValueChange={onValueChange} />)
      const { query, labelPattern } = chain()

      await openAndType(query)
      await pickSuggestion(labelPattern)
      onValueChange.mockClear()

      await clickClear()

      expect(onValueChange).toHaveBeenLastCalledWith(null)
      // The default Thai placeholder is business text shared by every engine's
      // template (same DEFAULT_TEXTS), not a DOM-shape concern — safe to
      // assert directly here, same as the cascade helper's locale='en' text.
      await expectTriggerLabel(/พิมพ์ตำบล/)
    })

    it('renders 4 hidden inputs reflecting the resolved address when name is set', async () => {
      render(<Component name="address" />)
      const { query, labelPattern, zipCode } = chain()

      await openAndType(query)
      await pickSuggestion(labelPattern)

      await waitFor(() => {
        expect(document.querySelector<HTMLInputElement>('input[name="address-zipcode"]')?.value).toBe(zipCode)
      })
    })
  })
}

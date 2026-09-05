import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ResolvedThaiAddress } from 'thaizip'

export type CascadeBehaviourOptions = {
  /** Label for the describe block, e.g. 'radix'. */
  engine: string
  Component: React.ComponentType<{
    value?: ResolvedThaiAddress | null
    defaultValue?: ResolvedThaiAddress | null
    onValueChange?: (address: ResolvedThaiAddress | null) => void
    name?: string
    locale?: 'th' | 'en'
    disabled?: boolean
    required?: boolean
  }>
  /** Opens the select whose accessible label matches, then clicks the named option. */
  pick: (labelText: string | RegExp, optionName: string) => Promise<void>
  /** The fixture chain, resolved once in the caller's beforeAll. */
  chain: () => {
    provinceName: string
    districtName: string
    subdistrictName: string
    address: ResolvedThaiAddress
    /**
     * A second, distinct province name. Radix's `Select` treats re-picking the
     * already-selected item as a no-op (it never calls `onValueChange` — the
     * same native-`<select>`-style behavior; Base UI's `Select` does fire it),
     * so "the province changes" must pick a genuinely different option to
     * exercise the reset-downstream/null-emit path on every engine.
     */
    otherProvinceName: string
  }
  labels: { province: string | RegExp; district: string | RegExp; subdistrict: string | RegExp }
}

export function describeCascadeSelectBehaviour(options: CascadeBehaviourOptions): void {
  const { engine, Component, pick, chain, labels } = options

  describe(`ThaiAddressCascadeSelect (${engine}) — shared behaviour`, () => {
    it('emits the resolved address after the full chain is picked', async () => {
      const onValueChange = vi.fn()
      render(<Component onValueChange={onValueChange} />)
      const { provinceName, districtName, subdistrictName, address } = chain()

      await pick(labels.province, provinceName)
      await pick(labels.district, districtName)
      await pick(labels.subdistrict, subdistrictName)

      expect(onValueChange).toHaveBeenLastCalledWith(address)
    })

    it('emits null and resets downstream when the province changes after a full pick', async () => {
      const onValueChange = vi.fn()
      render(<Component onValueChange={onValueChange} />)
      const { provinceName, districtName, subdistrictName, otherProvinceName } = chain()

      await pick(labels.province, provinceName)
      await pick(labels.district, districtName)
      await pick(labels.subdistrict, subdistrictName)
      onValueChange.mockClear()

      await pick(labels.province, otherProvinceName)
      expect(onValueChange).toHaveBeenCalledWith(null)
    })

    it('renders the four hidden inputs under the given name', async () => {
      const { address } = chain()
      const { container } = render(<Component name="addr" defaultValue={address} />)
      // The index loads asynchronously (useThaiAddressIndex resolves via a
      // promise), and the hidden inputs render only once it has — wait for the
      // triggers, which land in the same post-load render, before asserting.
      await screen.findAllByRole('combobox')

      for (const [suffix, expected] of [
        ['subdistrict', address.subdistrict],
        ['district', address.district],
        ['province', address.province],
        ['zipcode', address.zipCode],
      ] as const) {
        const input = container.querySelector<HTMLInputElement>(`input[type="hidden"][name="addr-${suffix}"]`)
        expect(input, `missing hidden input addr-${suffix}`).not.toBeNull()
        expect(input!.value).toBe(expected)
      }
    })

    it('renders no hidden inputs without a name', () => {
      const { address } = chain()
      const { container } = render(<Component defaultValue={address} />)
      expect(container.querySelectorAll('input[type="hidden"]')).toHaveLength(0)
    })

    it('shows English labels under locale="en"', () => {
      render(<Component locale="en" />)
      expect(screen.getByText('Province')).toBeTruthy()
      expect(screen.getByText('Postal code')).toBeTruthy()
    })
  })
}

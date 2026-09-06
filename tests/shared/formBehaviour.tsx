import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

export type FormBehaviourOptions = {
  /** Label for the describe block, e.g. 'radix'. */
  engine: string
  Component: React.ComponentType<{
    onValueChange?: (address: unknown) => void
    required?: boolean
  }>
  /**
   * Picks province → district → sub-district on the embedded cascade select,
   * waiting out each trigger's disabled-until-parent-picked state along the
   * way. Base UI's and Radix's `SelectTrigger` are both real `<button>`s
   * exposed as `role="combobox"` with native `disabled`; a future React Aria
   * variant may expose the wait/disabled check differently, so the whole
   * cascade-driving sequence is delegated to each engine's own test file
   * rather than hardcoded here — same reasoning as
   * `cascadeSelectBehaviour.tsx`'s `pick` and `expectDownstreamReset`.
   */
  selectFullCascade: (user: ReturnType<typeof userEvent.setup>) => Promise<void>
  /** The fixture chain, resolved once in the caller's beforeAll. */
  chain: () => {
    subdistrictName: string
    zipCode: string
  }
}

export function describeFormBehaviour(options: FormBehaviourOptions): void {
  const { engine, Component, selectFullCascade, chain } = options

  describe(`ThaiAddressForm (${engine}) — shared behaviour`, () => {
    it('emits a FullThaiAddress once the cascade resolves and house number is filled in', async () => {
      const user = userEvent.setup()
      const onValueChange = vi.fn()
      render(<Component onValueChange={onValueChange} />)

      await selectFullCascade(user)
      await user.type(screen.getByLabelText('บ้านเลขที่'), '123/45')

      const { subdistrictName, zipCode } = chain()
      await waitFor(() =>
        expect(onValueChange).toHaveBeenLastCalledWith(
          expect.objectContaining({ houseNo: '123/45', subdistrict: subdistrictName, zipCode }),
        ),
      )
    })

    it('keeps moo/soi/street always-optional even when required is set', async () => {
      const user = userEvent.setup()
      const onValueChange = vi.fn()
      render(<Component required onValueChange={onValueChange} />)

      expect((screen.getByLabelText('หมู่') as HTMLInputElement).required).toBe(false)
      expect((screen.getByLabelText('บ้านเลขที่') as HTMLInputElement).required).toBe(true)

      await selectFullCascade(user)
      await user.type(screen.getByLabelText('บ้านเลขที่'), '99')

      await waitFor(() => expect(onValueChange).toHaveBeenLastCalledWith(expect.objectContaining({ houseNo: '99' })))
    })
  })
}

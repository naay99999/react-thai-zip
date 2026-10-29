import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
    'aria-invalid'?: boolean | 'true' | 'false'
    ref?: React.Ref<HTMLInputElement>
  }>
  /** The fixture chain, resolved once in the caller's beforeAll. */
  chain: () => {
    /** A short substring of the sample record's sub-district name to type. */
    query: string
    /** Matches the sample record's sub-district name wherever it's rendered. */
    labelPattern: RegExp
    zipCode: string
  }
}

// Every engine's shadcn `combobox` primitive renders a real text input with
// role="combobox" (Base UI's Combobox.Input for base/radix, RAC's ComboBox
// input for aria) and role="option" items, so — unlike the earlier
// Popover+Command templates — no lookup needs delegating to the engine's own
// test file.
async function getInput(): Promise<HTMLInputElement> {
  return (await screen.findByRole('combobox')) as HTMLInputElement
}

async function typeQuery(query: string) {
  const user = userEvent.setup()
  await user.type(await getInput(), query)
  return user
}

async function pickSuggestion(labelPattern: RegExp) {
  const user = userEvent.setup()
  await user.click(await screen.findByRole('option', { name: labelPattern }))
}

export function describeAutocompleteBehaviour(options: AutocompleteBehaviourOptions): void {
  const { engine, Component, chain } = options

  describe(`ThaiAddressAutocomplete (${engine}) — shared behaviour`, () => {
    it('lets the user type straight into the field and pick a suggestion', async () => {
      const onValueChange = vi.fn()
      render(<Component onValueChange={onValueChange} />)
      const { query, labelPattern, zipCode } = chain()

      await typeQuery(query)
      await pickSuggestion(labelPattern)

      await waitFor(() => expect(onValueChange).toHaveBeenCalled())
      const [address] = onValueChange.mock.calls.at(-1)!
      expect(address.zipCode).toBe(zipCode)
      await waitFor(() => expect((screen.getByRole('combobox') as HTMLInputElement).value).toMatch(labelPattern))
    })

    it('selects the highlighted suggestion with the keyboard', async () => {
      const onValueChange = vi.fn()
      render(<Component onValueChange={onValueChange} />)
      const { query } = chain()

      const user = await typeQuery(query)
      await screen.findAllByRole('option')
      // Let the last keystroke's debounced search (200ms default) land first:
      // RAC drops its keyboard-focused item when the list is replaced, so an
      // ArrowDown fired between two result sets highlights nothing.
      await act(() => new Promise((resolve) => setTimeout(resolve, 300)))
      await user.keyboard('{ArrowDown}{Enter}')

      await waitFor(() => expect(onValueChange).toHaveBeenCalledWith(expect.objectContaining({ zipCode: expect.any(String) })))
    })

    it('keeps the selected text after the field loses focus', async () => {
      render(
        <div>
          <Component />
          <button type="button">outside target</button>
        </div>,
      )
      const { query, labelPattern } = chain()

      await typeQuery(query)
      await pickSuggestion(labelPattern)
      const input = await getInput()
      await waitFor(() => expect(input.value).toMatch(labelPattern))

      await userEvent.setup().click(screen.getByText('outside target'))

      await waitFor(() => expect(input.value).toMatch(labelPattern))
    })

    it('clears the resolved address and query when the clear control is pressed', async () => {
      const onValueChange = vi.fn()
      render(<Component onValueChange={onValueChange} />)
      const { query, labelPattern } = chain()

      await typeQuery(query)
      await pickSuggestion(labelPattern)
      onValueChange.mockClear()

      await userEvent.setup().click(await screen.findByRole('button', { name: 'ล้างที่อยู่' }))

      expect(onValueChange).toHaveBeenLastCalledWith(null)
      await waitFor(() => expect((screen.getByRole('combobox') as HTMLInputElement).value).toBe(''))
    })

    it('renders 4 hidden inputs reflecting the resolved address when name is set', async () => {
      render(<Component name="address" />)
      const { query, labelPattern, zipCode } = chain()

      await typeQuery(query)
      await pickSuggestion(labelPattern)

      await waitFor(() => {
        expect(document.querySelector<HTMLInputElement>('input[name="address-zipcode"]')?.value).toBe(zipCode)
      })
    })

    it('forwards the ref to the text input', async () => {
      const ref = React.createRef<HTMLInputElement>()
      render(<Component ref={ref} />)

      const input = await getInput()
      expect(ref.current).toBe(input)
    })

    it('applies aria-invalid to the text input', async () => {
      render(<Component aria-invalid />)
      const input = await getInput()
      expect(input.getAttribute('aria-invalid')).toBe('true')
    })
  })
}

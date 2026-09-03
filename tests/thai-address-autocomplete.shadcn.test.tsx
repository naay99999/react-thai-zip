// @vitest-environment jsdom
import * as React from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { loadDefaultIndex } from 'thaizip/data'
import type { ThaiAddressRecord } from 'thaizip'
import { ThaiAddressAutocomplete } from '../templates/react/ts/shadcn/thai-address-autocomplete'

if (!('ResizeObserver' in globalThis)) {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
}
for (const method of ['hasPointerCapture', 'setPointerCapture', 'releasePointerCapture'] as const) {
  if (!(method in Element.prototype)) {
    // @ts-expect-error -- test-environment polyfill
    Element.prototype[method] = () => (method === 'hasPointerCapture' ? false : undefined)
  }
}
if (!('scrollIntoView' in Element.prototype)) {
  // @ts-expect-error -- test-environment polyfill
  Element.prototype.scrollIntoView = () => {}
}

let sampleRecord: ThaiAddressRecord
let sampleLabel: string

beforeAll(async () => {
  const index = await loadDefaultIndex()
  sampleRecord = index.records[0]
  sampleLabel = `${sampleRecord.tambonNameTh} > ${sampleRecord.amphureNameTh} > ${sampleRecord.provinceNameTh} ${sampleRecord.zipCode}`
})

afterEach(() => {
  cleanup()
})

describe('ThaiAddressAutocomplete (shadcn)', () => {
  it('opens the popover on trigger click and lets the user pick a suggestion by typing', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<ThaiAddressAutocomplete onValueChange={onValueChange} />)

    const trigger = await screen.findByRole('button', { name: /พิมพ์ตำบล/ })
    await user.click(trigger)

    const searchBox = await screen.findByRole('combobox')
    await user.type(searchBox, sampleRecord.tambonNameTh.slice(0, 3))

    const option = await screen.findByText(new RegExp(sampleRecord.tambonNameTh))
    await user.click(option)

    await waitFor(() => expect(onValueChange).toHaveBeenCalled())
    const [address] = onValueChange.mock.calls.at(-1)!
    expect(address.zipCode).toBe(sampleRecord.zipCode)
    expect(await screen.findByRole('button', { name: new RegExp(sampleLabel.split(' > ')[0]) })).toBeTruthy()
  })

  it('clears the resolved address and query when the clear button is pressed', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<ThaiAddressAutocomplete onValueChange={onValueChange} />)

    const trigger = await screen.findByRole('button', { name: /พิมพ์ตำบล/ })
    await user.click(trigger)
    const searchBox = await screen.findByRole('combobox')
    await user.type(searchBox, sampleRecord.tambonNameTh.slice(0, 3))
    const option = await screen.findByText(new RegExp(sampleRecord.tambonNameTh))
    await user.click(option)
    onValueChange.mockClear()

    const clearButton = await screen.findByRole('button', { name: 'ล้างที่อยู่' })
    await user.click(clearButton)

    expect(onValueChange).toHaveBeenLastCalledWith(null)
    expect(await screen.findByRole('button', { name: /พิมพ์ตำบล/ })).toBeTruthy()
  })

  it('renders 4 hidden inputs reflecting the resolved address when name is set', async () => {
    const user = userEvent.setup()
    render(<ThaiAddressAutocomplete name="address" />)

    const trigger = await screen.findByRole('button', { name: /พิมพ์ตำบล/ })
    await user.click(trigger)
    const searchBox = await screen.findByRole('combobox')
    await user.type(searchBox, sampleRecord.tambonNameTh.slice(0, 3))
    const option = await screen.findByText(new RegExp(sampleRecord.tambonNameTh))
    await user.click(option)

    await waitFor(() => {
      expect(document.querySelector<HTMLInputElement>('input[name="address-zipcode"]')?.value).toBe(sampleRecord.zipCode)
    })
  })
})

// @vitest-environment jsdom
import * as React from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { loadDefaultIndex } from 'thaizip/data'
import type { ResolvedThaiAddress, ThaiAddressRecord } from 'thaizip'
import { ThaiAddressAutocomplete } from '../templates/react/ts/thai-address-autocomplete'

// jsdom doesn't implement the floating-ui / pointer-capture primitives Base UI's
// positioning + interaction layer relies on — stub them so the popup can actually open.
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

const DEFAULT_ADDRESS: ResolvedThaiAddress = {
  tambon: 'บางนา',
  tambonEn: 'Bang Na',
  amphure: 'บางนา',
  amphureEn: 'Bang Na',
  province: 'กรุงเทพมหานคร',
  provinceEn: 'Bangkok',
  zipCode: '10260',
  subdistrict: 'บางนา',
  subdistrictEn: 'Bang Na',
  district: 'บางนา',
  districtEn: 'Bang Na',
  postalCode: '10260',
}
const DEFAULT_ADDRESS_LABEL = `${DEFAULT_ADDRESS.subdistrict} > ${DEFAULT_ADDRESS.district} > ${DEFAULT_ADDRESS.province} ${DEFAULT_ADDRESS.zipCode}`

let sampleRecord: ThaiAddressRecord
let sampleLabel: string

beforeAll(async () => {
  // Real bundled index + real search — this is a Base UI interaction bug, not something
  // a mocked index/hook can reproduce.
  const index = await loadDefaultIndex()
  sampleRecord = index.records[0]
  sampleLabel = `${sampleRecord.tambonNameTh} > ${sampleRecord.amphureNameTh} > ${sampleRecord.provinceNameTh} ${sampleRecord.zipCode}`
})

afterEach(() => {
  cleanup()
})

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function getReadyInput() {
  const input = await screen.findByRole('combobox')
  await waitFor(() => expect((input as HTMLInputElement).disabled).toBe(false))
  return input as HTMLInputElement
}

describe('ThaiAddressAutocomplete — Base UI selection-state sync', () => {
  it('does not wipe a defaultValue-seeded input when the popup opens and closes without a selection', async () => {
    const onValueChange = vi.fn()
    const user = userEvent.setup()

    render(
      <div>
        <ThaiAddressAutocomplete defaultValue={DEFAULT_ADDRESS} onValueChange={onValueChange} />
        <button type="button">outside target</button>
      </div>,
    )

    const input = await getReadyInput()
    expect(input.value).toBe(DEFAULT_ADDRESS_LABEL)

    // Open the popup (openOnInputClick default) without selecting anything, then close it.
    await user.click(input)
    await screen.findByText('ไม่พบที่อยู่')
    await user.click(screen.getByText('outside target'))

    await waitFor(() => expect(screen.queryByText('ไม่พบที่อยู่')).toBeNull())

    // Base UI's Root force-resyncs the input to its own internal selected value on every
    // close; left uncontrolled that value is stale/undefined and wipes the seeded text.
    expect(input.value).toBe(DEFAULT_ADDRESS_LABEL)
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('keeps a selection cleared through the clear button after the popup closes', async () => {
    const onValueChange = vi.fn()
    const user = userEvent.setup()

    render(
      <div>
        <ThaiAddressAutocomplete onValueChange={onValueChange} debounce={10} limit={50} />
        <button type="button">outside target</button>
      </div>,
    )

    const input = await getReadyInput()

    await user.click(input)
    await user.type(input, sampleRecord.tambonNameEn)

    const option = await screen.findByRole(
      'option',
      { name: new RegExp(escapeRegExp(sampleLabel)) },
      { timeout: 2000 },
    )
    await user.click(option)

    await waitFor(() => expect(input.value).toBe(sampleLabel))
    expect(onValueChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ subdistrict: sampleRecord.tambonNameTh, zipCode: sampleRecord.zipCode }),
    )

    const clearButton = await screen.findByRole('button', { name: 'ล้างที่อยู่' })
    await user.click(clearButton)
    expect(input.value).toBe('')

    // Close without reselecting. If Base UI's Root still holds the old selection
    // internally (never told about the clear), this resync refills the input with it.
    await user.click(screen.getByText('outside target'))

    await waitFor(() => expect(input.value).toBe(''))
    expect(onValueChange).toHaveBeenLastCalledWith(null)
  })

  it('disables the hidden form-integration inputs so a disabled field is excluded from submission', async () => {
    const { container } = render(
      <ThaiAddressAutocomplete name="addr" disabled defaultValue={DEFAULT_ADDRESS} />,
    )

    // Wait for the async index load to finish and the "Ready" subtree (which renders the
    // hidden inputs) to mount, mirroring getReadyInput()'s readiness wait above.
    await screen.findByRole('combobox')

    for (const suffix of ['subdistrict', 'district', 'province', 'zipcode']) {
      const hiddenInput = await waitFor(() => {
        const el = container.querySelector<HTMLInputElement>(`input[name="addr-${suffix}"]`)
        expect(el).not.toBeNull()
        return el as HTMLInputElement
      })
      expect(hiddenInput.disabled).toBe(true)
    }
  })

  it("renders English placeholder and suggestion labels when locale='en'", async () => {
    const user = userEvent.setup()
    render(<ThaiAddressAutocomplete locale="en" />)
    const input = await getReadyInput()
    expect(input.placeholder).toBe('Type sub-district, district, province or postal code')
    await user.type(input, sampleRecord.tambonNameEn.slice(0, 4))
    const option = await screen.findByRole('option', { name: new RegExp(escapeRegExp(sampleRecord.tambonNameEn), 'i') })
    expect(option).toBeTruthy()
  })

  it('re-syncs the visible text when a controlled value is set and cleared', async () => {
    function Harness() {
      const [value, setValue] = React.useState<ResolvedThaiAddress | null>(null)
      return (
        <div>
          <ThaiAddressAutocomplete value={value} onValueChange={setValue} />
          <button type="button" onClick={() => setValue(DEFAULT_ADDRESS)}>
            set
          </button>
          <button type="button" onClick={() => setValue(null)}>
            unset
          </button>
        </div>
      )
    }
    const user = userEvent.setup()
    render(<Harness />)
    const input = await getReadyInput()
    await user.click(screen.getByRole('button', { name: 'set' }))
    await waitFor(() => expect(input.value).toBe(DEFAULT_ADDRESS_LABEL))
    await user.click(screen.getByRole('button', { name: 'unset' }))
    await waitFor(() => expect(input.value).toBe(''))
  })

  it('populates the hidden inputs after a selection and nulls the value when the input is emptied', async () => {
    const onValueChange = vi.fn()
    const user = userEvent.setup()
    render(<ThaiAddressAutocomplete name="addr" onValueChange={onValueChange} />)
    const input = await getReadyInput()
    await user.type(input, sampleRecord.tambonNameTh.slice(0, 4))
    const option = await screen.findByRole('option', { name: new RegExp(escapeRegExp(sampleRecord.tambonNameTh)) })
    await user.click(option)
    await waitFor(() =>
      expect((document.querySelector('input[name="addr-zipcode"]') as HTMLInputElement).value).toBe(
        sampleRecord.zipCode,
      ),
    )
    expect((document.querySelector('input[name="addr-province"]') as HTMLInputElement).value).toBe(
      sampleRecord.provinceNameTh,
    )
    expect(onValueChange).toHaveBeenCalledTimes(1)
    await user.clear(input)
    await waitFor(() => expect(onValueChange).toHaveBeenLastCalledWith(null))
  })
})

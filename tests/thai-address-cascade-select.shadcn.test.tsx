// @vitest-environment jsdom
import * as React from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { loadDefaultIndex } from 'thaizip/data'
import { listAmphures, listProvinces, listTambons } from 'thaizip'
import type { AmphureSummary, ProvinceSummary, ResolvedThaiAddress, TambonSummary } from 'thaizip'
import { ThaiAddressCascadeSelect } from '../templates/react/ts/shadcn/thai-address-cascade-select'

// Same Base UI jsdom polyfills as tests/thai-address-cascade-select.test.tsx —
// this is the identical Base UI Select/Popover machinery underneath shadcn's
// own wrapper components.
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

let province: ProvinceSummary
let amphure: AmphureSummary
let tambon: TambonSummary
let expectedAddress: ResolvedThaiAddress

beforeAll(async () => {
  const index = await loadDefaultIndex()
  province = listProvinces(index)[0]
  const amphures = listAmphures(index, province.id)
  expect(amphures.length).toBeGreaterThanOrEqual(1)
  amphure = amphures[0]
  tambon = listTambons(index, amphure.id)[0]
  expectedAddress = {
    tambon: tambon.nameTh,
    tambonEn: tambon.nameEn,
    amphure: amphure.nameTh,
    amphureEn: amphure.nameEn,
    province: province.nameTh,
    provinceEn: province.nameEn,
    zipCode: tambon.zipCode,
    subdistrict: tambon.nameTh,
    subdistrictEn: tambon.nameEn,
    district: amphure.nameTh,
    districtEn: amphure.nameEn,
    postalCode: tambon.zipCode,
  }
})

afterEach(() => {
  cleanup()
})

async function getTriggers() {
  const triggers = await screen.findAllByRole('combobox')
  expect(triggers).toHaveLength(3)
  return triggers
}

async function pickOption(trigger: HTMLElement, name: string, user: ReturnType<typeof userEvent.setup>) {
  await user.click(trigger)
  const option = await screen.findByRole('option', { name })
  await user.click(option)
}

describe('ThaiAddressCascadeSelect (shadcn)', () => {
  it('resolves a full address once province > district > sub-district are all picked', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<ThaiAddressCascadeSelect onValueChange={onValueChange} />)

    const [provinceTrigger] = await getTriggers()
    await pickOption(provinceTrigger, province.nameTh, user)

    const [, districtTrigger] = await getTriggers()
    await waitFor(() => expect((districtTrigger as HTMLButtonElement).disabled).toBe(false))
    await pickOption(districtTrigger, amphure.nameTh, user)

    const [, , subdistrictTrigger] = await getTriggers()
    await waitFor(() => expect((subdistrictTrigger as HTMLButtonElement).disabled).toBe(false))
    await pickOption(subdistrictTrigger, tambon.nameTh, user)

    await waitFor(() => expect(onValueChange).toHaveBeenLastCalledWith(expectedAddress))
    expect(screen.getByDisplayValue(tambon.zipCode)).toBeTruthy()
  })

  it('resets district and sub-district, and fires onValueChange(null), when the province changes after a full selection', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<ThaiAddressCascadeSelect defaultValue={expectedAddress} onValueChange={onValueChange} />)

    const otherProvince = listProvinces(await loadDefaultIndex()).find((entry) => entry.id !== province.id)!
    const [provinceTrigger] = await getTriggers()
    await waitFor(() => expect(within(provinceTrigger).queryByText(province.nameTh)).toBeTruthy())

    await pickOption(provinceTrigger, otherProvince.nameTh, user)

    await waitFor(() => expect(onValueChange).toHaveBeenCalledWith(null))
    // The district trigger becomes *re-enabled* immediately (populated with the
    // newly-picked province's own districts) — it's the sub-district trigger that
    // resets to disabled, since amphureId is cleared along with the province change.
    // See tests/thai-address-cascade-select.test.tsx's equivalent vanilla test.
    const [, , subdistrictTrigger] = await getTriggers()
    expect((subdistrictTrigger as HTMLButtonElement).disabled).toBe(true)
  })

  it('renders 4 hidden inputs reflecting the resolved address when name is set', async () => {
    render(<ThaiAddressCascadeSelect name="address" defaultValue={expectedAddress} />)
    await getTriggers()
    await waitFor(() => {
      expect(document.querySelector<HTMLInputElement>('input[name="address-province"]')?.value).toBe(province.nameTh)
    })
    expect(document.querySelector<HTMLInputElement>('input[name="address-district"]')?.value).toBe(amphure.nameTh)
    expect(document.querySelector<HTMLInputElement>('input[name="address-subdistrict"]')?.value).toBe(tambon.nameTh)
    expect(document.querySelector<HTMLInputElement>('input[name="address-zipcode"]')?.value).toBe(tambon.zipCode)
  })
})

// @vitest-environment jsdom
import { afterEach, beforeAll, expect } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { loadDefaultIndex } from 'thaizip/data'
import { listAmphures, listProvinces, listTambons } from 'thaizip'
import type { AmphureSummary, ProvinceSummary, ResolvedThaiAddress, TambonSummary } from 'thaizip'
import { ThaiAddressCascadeSelect } from '../templates/react/ts/shadcn/radix/thai-address-cascade-select'
import { describeCascadeSelectBehaviour } from './shared/cascadeSelectBehaviour'

// Radix needs the same jsdom polyfills as Base UI, for the same reasons —
// ResizeObserver, pointer capture, and scrollIntoView are all exercised by its
// Select/Popover machinery underneath shadcn's own wrapper components.
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
let otherProvince: ProvinceSummary
let amphure: AmphureSummary
let tambon: TambonSummary
let expectedAddress: ResolvedThaiAddress

beforeAll(async () => {
  const index = await loadDefaultIndex()
  province = listProvinces(index)[0]
  otherProvince = listProvinces(index).find((entry) => entry.id !== province.id)!
  const amphures = listAmphures(index, province.id)
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

// Radix's SelectTrigger is `aria-labelledby`-linked to the field's <Label>, so
// its accessible name is the label text — the one genuinely engine-specific
// mechanic the shared behaviour helper delegates to each engine's test file.
async function pick(labelText: string | RegExp, optionName: string) {
  const user = userEvent.setup()
  // The index loads asynchronously, so the trigger for a given label may not
  // exist (or may still be the disabled loading-state button) on first render.
  const trigger = await screen.findByRole('combobox', { name: labelText })
  await user.click(trigger)
  const option = await screen.findByRole('option', { name: optionName })
  await user.click(option)
}

const labels = {
  province: 'จังหวัด',
  district: 'อำเภอ/เขต',
  subdistrict: 'ตำบล/แขวง',
} as const

// Radix's SelectTrigger is a real `<button>`; disabled state is the native
// `disabled` property. This lookup is radix-specific by design — see the
// shared helper's `expectDownstreamReset` doc comment.
async function expectDownstreamReset() {
  const subdistrictTrigger = await screen.findByRole('combobox', { name: labels.subdistrict })
  expect((subdistrictTrigger as HTMLButtonElement).disabled).toBe(true)
}

// Radix's triggers render `role="combobox"` only once the index has loaded
// and the real controls (as opposed to the disabled loading-state
// placeholders) have mounted.
async function waitForLoad() {
  await screen.findAllByRole('combobox')
}

// All three triggers, province/district/subdistrict in DOM order.
async function getTriggers() {
  return screen.findAllByRole('combobox')
}

describeCascadeSelectBehaviour({
  engine: 'radix',
  Component: ThaiAddressCascadeSelect,
  pick,
  chain: () => ({
    provinceName: province.nameTh,
    districtName: amphure.nameTh,
    subdistrictName: tambon.nameTh,
    address: expectedAddress,
    otherProvinceName: otherProvince.nameTh,
  }),
  labels,
  expectDownstreamReset,
  waitForLoad,
  getTriggers,
})

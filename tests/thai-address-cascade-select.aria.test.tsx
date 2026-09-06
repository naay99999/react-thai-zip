// @vitest-environment jsdom
import { afterEach, beforeAll, expect } from 'vitest'
import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { loadDefaultIndex } from 'thaizip/data'
import { listAmphures, listProvinces, listTambons } from 'thaizip'
import type { AmphureSummary, ProvinceSummary, ResolvedThaiAddress, TambonSummary } from 'thaizip'
import { ThaiAddressCascadeSelect } from '../templates/react/ts/shadcn/aria/thai-address-cascade-select'
import { describeCascadeSelectBehaviour } from './shared/cascadeSelectBehaviour'

// React Aria needs the same jsdom polyfills as Base UI and Radix, for the
// same reasons — ResizeObserver, pointer capture, and scrollIntoView are all
// exercised by its Select/Popover machinery underneath shadcn's own wrapper
// components.
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

// React Aria's SelectTrigger renders a RAC `Button`, not a `<button
// role="combobox">` — its accessible name is computed from the Select's
// internal `aria-labelledby` wiring (the current value's text plus the
// field's own <Label>), so a plain exact match on the label text alone
// doesn't work. Matching a RegExp built from the label text instead finds it
// as a substring of that concatenated name.
function triggerPattern(labelText: string | RegExp): RegExp {
  return typeof labelText === 'string' ? new RegExp(labelText) : labelText
}

// RAC renders options as `role="option"` inside a `role="listbox"` — opening
// a Select mounts that listbox (in a portal), so the option lookup is scoped
// to it rather than the whole document.
async function pick(labelText: string | RegExp, optionName: string) {
  const user = userEvent.setup()
  // The index loads asynchronously, so the trigger for a given label may not
  // exist (or may still be the disabled loading-state button) on first render.
  const trigger = await screen.findByRole('button', { name: triggerPattern(labelText) })
  await user.click(trigger)
  const listbox = await screen.findByRole('listbox')
  const option = within(listbox).getByRole('option', { name: optionName })
  await user.click(option)
}

const labels = {
  province: 'จังหวัด',
  district: 'อำเภอ/เขต',
  subdistrict: 'ตำบล/แขวง',
} as const

// RAC's SelectTrigger renders a real, native `<button>` under the hood
// (react-aria-components' Button primitive); `isDisabled` reflects as the
// native `disabled` property. This lookup is aria-specific by design — see
// the shared helper's `expectDownstreamReset` doc comment.
async function expectDownstreamReset() {
  const subdistrictTrigger = await screen.findByRole('button', { name: new RegExp(labels.subdistrict) })
  expect((subdistrictTrigger as HTMLButtonElement).disabled).toBe(true)
}

// The index loads asynchronously, and the disabled loading-state
// placeholders are plain `<Button isDisabled>` elements too — so waiting for
// a `role="button"` doesn't distinguish "still loading" from "ready". Wait
// for the province trigger's accessible name to actually contain the
// province label before proceeding.
async function waitForLoad() {
  await screen.findByRole('button', { name: new RegExp(labels.province) })
}

// All three triggers, province/district/subdistrict in that order — each
// found by its own accessible-name pattern (see `triggerPattern`'s doc
// comment above) rather than by a shared role query, since RAC's trigger
// carries no distinguishing role of its own.
async function getTriggers() {
  const provinceTrigger = await screen.findByRole('button', { name: triggerPattern(labels.province) })
  const districtTrigger = await screen.findByRole('button', { name: triggerPattern(labels.district) })
  const subdistrictTrigger = await screen.findByRole('button', { name: triggerPattern(labels.subdistrict) })
  return [provinceTrigger, districtTrigger, subdistrictTrigger]
}

describeCascadeSelectBehaviour({
  engine: 'aria',
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

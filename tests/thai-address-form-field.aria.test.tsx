// @vitest-environment jsdom
import { afterEach, beforeAll, expect } from 'vitest'
import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { loadDefaultIndex } from 'thaizip/data'
import { listAmphures, listProvinces, listTambons } from 'thaizip'
import type { AmphureSummary, ProvinceSummary, TambonSummary } from 'thaizip'
import { ThaiAddressFormField } from '../templates/react/ts/shadcn/aria/thai-address-form-field'
import { describeFormFieldBehaviour } from './shared/formFieldBehaviour'

// React Aria needs the same jsdom polyfills as Base UI and Radix, for the same reasons —
// ResizeObserver, pointer capture, and scrollIntoView are all exercised by its Select/Popover
// machinery underneath the embedded cascade select.
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

beforeAll(async () => {
  const index = await loadDefaultIndex()
  province = listProvinces(index)[0]
  amphure = listAmphures(index, province.id)[0]
  tambon = listTambons(index, amphure.id)[0]
})

afterEach(() => {
  cleanup()
})

// React Aria's SelectTrigger renders a RAC `Button`, not a `<button role="combobox">` — its
// accessible name concatenates the current value's text with the field's own <Label> text (see
// tests/thai-address-cascade-select.aria.test.tsx's `triggerPattern` doc comment), so triggers
// are found by a RegExp built from the label text rather than an exact match, and options live
// in a `role="listbox"` mounted in a portal once a trigger is opened.
const labels = {
  province: 'จังหวัด',
  district: 'อำเภอ/เขต',
  subdistrict: 'ตำบล/แขวง',
} as const

function triggerPattern(labelText: string): RegExp {
  return new RegExp(labelText)
}

// Same full-cascade selection pattern as tests/thai-address-form.aria.test.tsx and
// tests/thai-address-cascade-select.aria.test.tsx: the embedded cascade only resolves (and
// calls back with) a non-null `ResolvedThaiAddress` once province, district, and sub-district
// are all picked. Aria-specific by design; see the shared helper's `selectFullCascade` doc
// comment.
async function selectFullCascade(user: ReturnType<typeof userEvent.setup>) {
  const provinceTrigger = await screen.findByRole('button', { name: triggerPattern(labels.province) })
  await user.click(provinceTrigger)
  let listbox = await screen.findByRole('listbox')
  await user.click(within(listbox).getByRole('option', { name: province.nameTh }))

  const districtTrigger = await screen.findByRole('button', { name: triggerPattern(labels.district) })
  await waitFor(() => expect((districtTrigger as HTMLButtonElement).disabled).toBe(false))
  await user.click(districtTrigger)
  listbox = await screen.findByRole('listbox')
  await user.click(within(listbox).getByRole('option', { name: amphure.nameTh }))

  const subdistrictTrigger = await screen.findByRole('button', { name: triggerPattern(labels.subdistrict) })
  await waitFor(() => expect((subdistrictTrigger as HTMLButtonElement).disabled).toBe(false))
  await user.click(subdistrictTrigger)
  listbox = await screen.findByRole('listbox')
  await user.click(within(listbox).getByRole('option', { name: tambon.nameTh }))
}

describeFormFieldBehaviour({
  engine: 'aria',
  Component: ThaiAddressFormField,
  selectFullCascade,
})

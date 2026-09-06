// @vitest-environment jsdom
import { afterEach, beforeAll, expect } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { loadDefaultIndex } from 'thaizip/data'
import { listAmphures, listProvinces, listTambons } from 'thaizip'
import type { AmphureSummary, ProvinceSummary, TambonSummary } from 'thaizip'
import { ThaiAddressFormField } from '../templates/react/ts/shadcn/base/thai-address-form-field'
import { describeFormFieldBehaviour } from './shared/formFieldBehaviour'

// Same Base UI jsdom polyfills as tests/thai-address-cascade-select.base.test.tsx — this is the
// identical Base UI Select/Popover machinery underneath the embedded cascade select.
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

// Same full-cascade selection pattern as tests/thai-address-form.base.test.tsx and
// tests/thai-address-cascade-select.base.test.tsx: the embedded cascade only resolves (and
// calls back with) a non-null `ResolvedThaiAddress` once province, district, and sub-district
// are all picked. Base UI–specific by design; see the shared helper's `selectFullCascade` doc
// comment.
async function selectFullCascade(user: ReturnType<typeof userEvent.setup>) {
  const triggers = await screen.findAllByRole('combobox')
  await user.click(triggers[0])
  await user.click(await screen.findByRole('option', { name: province.nameTh }))

  const districtTrigger = (await screen.findAllByRole('combobox'))[1]
  await waitFor(() => expect((districtTrigger as HTMLButtonElement).disabled).toBe(false))
  await user.click(districtTrigger)
  await user.click(await screen.findByRole('option', { name: amphure.nameTh }))

  const subdistrictTrigger = (await screen.findAllByRole('combobox'))[2]
  await waitFor(() => expect((subdistrictTrigger as HTMLButtonElement).disabled).toBe(false))
  await user.click(subdistrictTrigger)
  await user.click(await screen.findByRole('option', { name: tambon.nameTh }))
}

describeFormFieldBehaviour({
  engine: 'base',
  Component: ThaiAddressFormField,
  selectFullCascade,
})

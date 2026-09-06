// @vitest-environment jsdom
import { afterEach, beforeAll, expect } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { loadDefaultIndex } from 'thaizip/data'
import { listAmphures, listProvinces, listTambons } from 'thaizip'
import type { AmphureSummary, ProvinceSummary, TambonSummary } from 'thaizip'
import { ThaiAddressForm } from '../templates/react/ts/shadcn/radix/thai-address-form'
import { describeFormBehaviour } from './shared/formBehaviour'

// Radix needs the same jsdom polyfills as Base UI, for the same reasons — ResizeObserver,
// pointer capture, and scrollIntoView are all exercised by its Select/Popover machinery
// underneath the embedded cascade select.
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

// The embedded cascade only resolves (and calls back with) a non-null selection once province,
// district, and sub-district are all picked, and each downstream trigger stays disabled until
// its own parent is chosen — Radix's SelectTrigger is a real `<button>`, so this waits on the
// native `disabled` property between picks. Radix-specific by design; see the shared helper's
// `selectFullCascade` doc comment.
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

describeFormBehaviour({
  engine: 'radix',
  Component: ThaiAddressForm,
  selectFullCascade,
  chain: () => ({
    subdistrictName: tambon.nameTh,
    zipCode: tambon.zipCode,
  }),
})

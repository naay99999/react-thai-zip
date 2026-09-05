// @vitest-environment jsdom
import { afterEach, beforeAll } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { loadDefaultIndex } from 'thaizip/data'
import type { ThaiAddressRecord } from 'thaizip'
import { ThaiAddressAutocomplete } from '../templates/react/ts/shadcn/aria/thai-address-autocomplete'
import { describeAutocompleteBehaviour } from './shared/autocompleteBehaviour'

// React Aria needs the same jsdom polyfills as Base UI and Radix, for the
// same reasons — ResizeObserver, pointer capture, and scrollIntoView are all
// exercised by its Popover/Autocomplete machinery underneath shadcn's own
// wrapper components.
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

beforeAll(async () => {
  const index = await loadDefaultIndex()
  sampleRecord = index.records[0]
})

afterEach(() => {
  cleanup()
})

// The aria trigger is a RAC `Button`, a real <button> with no distinguishing
// role beyond "button" (same as the base/radix triggers). The search box
// underneath is aria's `CommandInput`, rendered inside a RAC `SearchField` —
// role="searchbox", not "combobox" like the cmdk-backed engines. This is the
// one genuinely engine-specific mechanic the shared behaviour helper
// delegates to each engine's test file. See the shared helper's doc
// comments.
async function openAndType(query: string) {
  const user = userEvent.setup()
  const trigger = await screen.findByRole('button', { name: /พิมพ์ตำบล/ })
  await user.click(trigger)
  const searchBox = await screen.findByRole('searchbox')
  await user.type(searchBox, query)
}

// RAC's CommandItem is a MenuItem, rendering role="option" the same as
// cmdk's — aria-specific by design, see the shared helper's `pickSuggestion`
// doc comment.
async function pickSuggestion(labelPattern: RegExp) {
  const user = userEvent.setup()
  const option = await screen.findByText(labelPattern)
  await user.click(option)
}

async function clickClear() {
  const user = userEvent.setup()
  const clearButton = await screen.findByRole('button', { name: 'ล้างที่อยู่' })
  await user.click(clearButton)
}

async function expectTriggerLabel(pattern: RegExp) {
  await screen.findByRole('button', { name: pattern })
}

describeAutocompleteBehaviour({
  engine: 'aria',
  Component: ThaiAddressAutocomplete,
  openAndType,
  pickSuggestion,
  clickClear,
  expectTriggerLabel,
  chain: () => ({
    query: sampleRecord.tambonNameTh.slice(0, 3),
    labelPattern: new RegExp(sampleRecord.tambonNameTh),
    zipCode: sampleRecord.zipCode,
  }),
})

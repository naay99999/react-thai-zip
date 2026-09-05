// @vitest-environment jsdom
import { afterEach, beforeAll } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { loadDefaultIndex } from 'thaizip/data'
import type { ThaiAddressRecord } from 'thaizip'
import { ThaiAddressAutocomplete } from '../templates/react/ts/shadcn/radix/thai-address-autocomplete'
import { describeAutocompleteBehaviour } from './shared/autocompleteBehaviour'

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

// Radix's Popover trigger is a real <button>; the search field underneath is
// cmdk's role="combobox" input — the one genuinely engine-specific mechanic
// the shared behaviour helper delegates to each engine's test file. See the
// shared helper's doc comments.
async function getTrigger() {
  return screen.findByRole('button', { name: /พิมพ์ตำบล/ })
}

async function openPopup() {
  const user = userEvent.setup()
  const trigger = await getTrigger()
  await user.click(trigger)
}

async function openAndType(query: string) {
  const user = userEvent.setup()
  const trigger = await getTrigger()
  await user.click(trigger)
  const searchBox = await screen.findByRole('combobox')
  await user.type(searchBox, query)
}

// cmdk's CommandItem renders role="option"; radix-specific by design — see
// the shared helper's `pickSuggestion` doc comment.
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
  engine: 'radix',
  Component: ThaiAddressAutocomplete,
  openAndType,
  pickSuggestion,
  clickClear,
  expectTriggerLabel,
  openPopup,
  getTrigger,
  chain: () => ({
    query: sampleRecord.tambonNameTh.slice(0, 3),
    labelPattern: new RegExp(sampleRecord.tambonNameTh),
    zipCode: sampleRecord.zipCode,
  }),
})

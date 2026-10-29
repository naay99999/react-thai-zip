// @vitest-environment jsdom
import { afterEach, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { loadDefaultIndex } from 'thaizip/data'
import type { ThaiAddressRecord } from 'thaizip'
import { ThaiAddressAutocomplete } from '../templates/react/ts/shadcn/base/thai-address-autocomplete'
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

describeAutocompleteBehaviour({
  engine: 'base',
  Component: ThaiAddressAutocomplete,
  chain: () => ({
    query: sampleRecord.tambonNameTh.slice(0, 3),
    labelPattern: new RegExp(sampleRecord.tambonNameTh),
    zipCode: sampleRecord.zipCode,
  }),
})

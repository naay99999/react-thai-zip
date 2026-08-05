// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { loadDefaultIndex } from 'thaizip/data'
import { listAmphures, listProvinces, listTambons } from 'thaizip'
import type { AmphureSummary, ProvinceSummary, ResolvedThaiAddress, TambonSummary } from 'thaizip'
import { ThaiAddressCascadeSelect } from '../templates/react/ts/thai-address-cascade-select'

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
  amphure = listAmphures(index, province.id)[0]
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

// No @testing-library/jest-dom in this repo — assert via plain DOM properties,
// same as tests/thai-address-autocomplete.test.tsx.
function isDisabled(el: HTMLElement): boolean {
  return (el as HTMLButtonElement).disabled || el.getAttribute('data-disabled') !== null
}

function hiddenInput(nameAttr: string): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>(`input[name="${nameAttr}"]`)
  if (!input) throw new Error(`hidden input ${nameAttr} not found`)
  return input
}

// Base UI Select also mounts a visually-hidden native <input> per trigger for form
// integration, and when `name` is set the cascade adds its own `${name}-zipcode` hidden
// input alongside the visible read-only zip field — both legitimately carry the same
// value as the visible field, so `getByDisplayValue` alone is ambiguous. Assert against
// the one field a user actually sees.
function visibleDisplayValue(value: string): HTMLElement {
  const matches = screen.getAllByDisplayValue(value)
  const visible = matches.find((el) => el.getAttribute('type') !== 'hidden')
  if (!visible) throw new Error(`no visible display value found for ${value}`)
  return visible
}

async function getTriggers() {
  // Three comboboxes render in DOM order: province, district, subdistrict.
  // (Base UI Select triggers have role="combobox" per ARIA 1.2.)
  const triggers = await screen.findAllByRole('combobox')
  expect(triggers).toHaveLength(3)
  await waitFor(() => expect(isDisabled(triggers[0])).toBe(false))
  return { provinceTrigger: triggers[0], districtTrigger: triggers[1], subdistrictTrigger: triggers[2] }
}

async function pickOption(user: ReturnType<typeof userEvent.setup>, trigger: HTMLElement, optionName: string) {
  await user.click(trigger)
  const listbox = await screen.findByRole('listbox')
  await user.click(within(listbox).getByRole('option', { name: optionName }))
  await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())
}

describe('ThaiAddressCascadeSelect — cascade flow', () => {
  it('walks province > district > subdistrict, emits ResolvedThaiAddress, and shows the zip', async () => {
    const onValueChange = vi.fn()
    const user = userEvent.setup()
    render(<ThaiAddressCascadeSelect onValueChange={onValueChange} name="addr" />)

    const { provinceTrigger, districtTrigger, subdistrictTrigger } = await getTriggers()
    expect(isDisabled(districtTrigger)).toBe(true)
    expect(isDisabled(subdistrictTrigger)).toBe(true)

    await pickOption(user, provinceTrigger, province.nameTh)
    await waitFor(() => expect(isDisabled(districtTrigger)).toBe(false))
    expect(onValueChange).not.toHaveBeenCalled()

    await pickOption(user, districtTrigger, amphure.nameTh)
    await waitFor(() => expect(isDisabled(subdistrictTrigger)).toBe(false))

    await pickOption(user, subdistrictTrigger, tambon.nameTh)
    await waitFor(() => expect(onValueChange).toHaveBeenCalledWith(expectedAddress))

    expect(visibleDisplayValue(tambon.zipCode)).toBeTruthy()

    expect(hiddenInput('addr-province').value).toBe(province.nameTh)
    expect(hiddenInput('addr-district').value).toBe(amphure.nameTh)
    expect(hiddenInput('addr-subdistrict').value).toBe(tambon.nameTh)
    expect(hiddenInput('addr-zipcode').value).toBe(tambon.zipCode)
  })

  it('fires onValueChange(null) and resets children when a parent select invalidates the value', async () => {
    const onValueChange = vi.fn()
    const user = userEvent.setup()
    render(<ThaiAddressCascadeSelect onValueChange={onValueChange} />)

    const { provinceTrigger, districtTrigger, subdistrictTrigger } = await getTriggers()
    await pickOption(user, provinceTrigger, province.nameTh)
    await waitFor(() => expect(isDisabled(districtTrigger)).toBe(false))
    await pickOption(user, districtTrigger, amphure.nameTh)
    await waitFor(() => expect(isDisabled(subdistrictTrigger)).toBe(false))
    await pickOption(user, subdistrictTrigger, tambon.nameTh)
    await waitFor(() => expect(onValueChange).toHaveBeenCalledWith(expectedAddress))
    onValueChange.mockClear()

    // Picking a *different* province must reset the children and null the value.
    const index = await loadDefaultIndex()
    const otherProvince = listProvinces(index)[1]
    await pickOption(user, provinceTrigger, otherProvince.nameTh)

    await waitFor(() => expect(onValueChange).toHaveBeenCalledWith(null))
    expect(isDisabled(subdistrictTrigger)).toBe(true)
    expect(screen.queryByDisplayValue(tambon.zipCode)).toBeNull()
  })

  it('pre-selects the full chain from defaultValue and disables hidden inputs when disabled', async () => {
    render(<ThaiAddressCascadeSelect defaultValue={expectedAddress} name="addr" disabled />)

    const triggers = await screen.findAllByRole('combobox')
    await waitFor(() => expect(triggers[0].textContent).toContain(province.nameTh))
    expect(triggers[1].textContent).toContain(amphure.nameTh)
    expect(triggers[2].textContent).toContain(tambon.nameTh)
    expect(visibleDisplayValue(tambon.zipCode)).toBeTruthy()

    for (const suffix of ['province', 'district', 'subdistrict', 'zipcode'] as const) {
      expect(hiddenInput(`addr-${suffix}`).disabled).toBe(true)
    }
  })

  it("renders English option labels and texts when locale='en'", async () => {
    const user = userEvent.setup()
    render(<ThaiAddressCascadeSelect locale="en" />)

    const { provinceTrigger } = await getTriggers()
    expect(provinceTrigger.textContent).toContain('Select province')

    await user.click(provinceTrigger)
    const listbox = await screen.findByRole('listbox')
    expect(within(listbox).getByRole('option', { name: province.nameEn })).toBeTruthy()
  })
})

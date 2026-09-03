// @vitest-environment jsdom
import * as React from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { loadDefaultIndex } from 'thaizip/data'
import { listAmphures, listProvinces, listTambons } from 'thaizip'
import type { AmphureSummary, ProvinceSummary, ResolvedThaiAddress, TambonSummary } from 'thaizip'
import { ThaiAddressForm, type FullThaiAddress } from '../templates/react/ts/thai-address-form'

// Same Base UI + jsdom polyfills as tests/thai-address-cascade-select.test.tsx — this
// component embeds ThaiAddressCascadeSelect, so it needs the same environment shims.
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
  expect(amphures.length).toBeGreaterThanOrEqual(2)
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

// No @testing-library/jest-dom in this repo — assert via plain DOM properties, same as
// tests/thai-address-cascade-select.test.tsx / tests/thai-address-autocomplete.test.tsx.
function isDisabled(el: HTMLElement): boolean {
  return (el as HTMLButtonElement).disabled || el.getAttribute('data-disabled') !== null
}

function hiddenInput(nameAttr: string): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>(`input[name="${nameAttr}"]`)
  if (!input) throw new Error(`hidden input ${nameAttr} not found`)
  return input
}

async function getTriggers() {
  // Three comboboxes render in DOM order: province, district, subdistrict.
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

async function completeCascade(user: ReturnType<typeof userEvent.setup>) {
  const { provinceTrigger, districtTrigger, subdistrictTrigger } = await getTriggers()
  await pickOption(user, provinceTrigger, province.nameTh)
  await waitFor(() => expect(isDisabled(districtTrigger)).toBe(false))
  await pickOption(user, districtTrigger, amphure.nameTh)
  await waitFor(() => expect(isDisabled(subdistrictTrigger)).toBe(false))
  await pickOption(user, subdistrictTrigger, tambon.nameTh)
  return { provinceTrigger, districtTrigger, subdistrictTrigger }
}

function buildFullAddress(): FullThaiAddress {
  return { ...expectedAddress, houseNo: '99/1', moo: '2', soi: 'สุขใจ', street: 'สุขุมวิท' }
}

// Minimal controlled harness: mirrors how a real consumer would wire `value`/`onValueChange`
// back together (parent state echoes whatever the form emits, including `null`).
function ControlledHarness({ onChange }: { onChange: (next: FullThaiAddress | null) => void }) {
  const [value, setValue] = React.useState<FullThaiAddress | null>(null)
  return (
    <ThaiAddressForm
      value={value}
      onValueChange={(next) => {
        onChange(next)
        setValue(next)
      }}
    />
  )
}

describe('ThaiAddressForm', () => {
  it('fires onValueChange with a FullThaiAddress once house number is typed and the cascade is fully completed', async () => {
    const onValueChange = vi.fn()
    const user = userEvent.setup()
    render(<ThaiAddressForm onValueChange={onValueChange} name="addr" />)

    await completeCascade(user)
    onValueChange.mockClear()

    const houseNoInput = screen.getByLabelText('บ้านเลขที่')
    await user.type(houseNoInput, '123')

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith({ ...expectedAddress, houseNo: '123' }),
    )
  })

  it('does not fire a non-null value when only the cascade is completed (house number left empty)', async () => {
    const onValueChange = vi.fn()
    const user = userEvent.setup()
    render(<ThaiAddressForm onValueChange={onValueChange} />)

    await completeCascade(user)

    expect(onValueChange.mock.calls.every((call) => call[0] === null)).toBe(true)
  })

  it('does not fire a non-null value when house number is typed but the cascade is left incomplete', async () => {
    const onValueChange = vi.fn()
    const user = userEvent.setup()
    render(<ThaiAddressForm onValueChange={onValueChange} />)

    const { provinceTrigger } = await getTriggers()
    await pickOption(user, provinceTrigger, province.nameTh)

    const houseNoInput = screen.getByLabelText('บ้านเลขที่')
    await user.type(houseNoInput, '123')

    expect(onValueChange.mock.calls.every((call) => call[0] === null)).toBe(true)
  })

  it('renders all 8 hidden inputs with correct values once name is set and a full selection exists', async () => {
    const user = userEvent.setup()
    render(<ThaiAddressForm name="addr" />)

    await completeCascade(user)

    await user.type(screen.getByLabelText('บ้านเลขที่'), '99/1')
    await user.type(screen.getByLabelText('หมู่'), '2')
    await user.type(screen.getByLabelText('ซอย'), 'สุขใจ')
    await user.type(screen.getByLabelText('ถนน'), 'สุขุมวิท')

    await waitFor(() => expect(hiddenInput('addr-houseno').value).toBe('99/1'))
    expect(hiddenInput('addr-moo').value).toBe('2')
    expect(hiddenInput('addr-soi').value).toBe('สุขใจ')
    expect(hiddenInput('addr-street').value).toBe('สุขุมวิท')

    expect(hiddenInput('addr-subdistrict').value).toBe(tambon.nameTh)
    expect(hiddenInput('addr-district').value).toBe(amphure.nameTh)
    expect(hiddenInput('addr-province').value).toBe(province.nameTh)
    expect(hiddenInput('addr-zipcode').value).toBe(tambon.zipCode)
  })

  it('trims the hidden houseno/moo/soi/street inputs so a native form submit matches onValueChange', async () => {
    const user = userEvent.setup()
    render(<ThaiAddressForm name="addr" />)

    await completeCascade(user)

    await user.type(screen.getByLabelText('บ้านเลขที่'), '  99/1  ')
    await user.type(screen.getByLabelText('หมู่'), '  2  ')
    await user.type(screen.getByLabelText('ซอย'), '  สุขใจ  ')
    await user.type(screen.getByLabelText('ถนน'), '  สุขุมวิท  ')

    await waitFor(() => expect(hiddenInput('addr-houseno').value).toBe('99/1'))
    expect(hiddenInput('addr-moo').value).toBe('2')
    expect(hiddenInput('addr-soi').value).toBe('สุขใจ')
    expect(hiddenInput('addr-street').value).toBe('สุขุมวิท')
  })

  it('controlled value prop pre-fills the house-number input and pre-selects the cascade triggers', async () => {
    const value = buildFullAddress()
    render(<ThaiAddressForm value={value} onValueChange={() => {}} />)

    const houseNoInput = screen.getByLabelText('บ้านเลขที่') as HTMLInputElement
    expect(houseNoInput.value).toBe(value.houseNo)

    const triggers = await screen.findAllByRole('combobox')
    await waitFor(() => expect(triggers[0].textContent).toContain(province.nameTh))
    expect(triggers[1].textContent).toContain(amphure.nameTh)
    expect(triggers[2].textContent).toContain(tambon.nameTh)
  })

  it('uncontrolled defaultValue seeds the same initial state without a value prop', async () => {
    const value = buildFullAddress()
    render(<ThaiAddressForm defaultValue={value} />)

    const houseNoInput = screen.getByLabelText('บ้านเลขที่') as HTMLInputElement
    expect(houseNoInput.value).toBe(value.houseNo)

    const triggers = await screen.findAllByRole('combobox')
    await waitFor(() => expect(triggers[0].textContent).toContain(province.nameTh))
    expect(triggers[1].textContent).toContain(amphure.nameTh)
    expect(triggers[2].textContent).toContain(tambon.nameTh)
  })

  it('fires onValueChange(null) when the house-number field is cleared after a full selection', async () => {
    const onValueChange = vi.fn()
    const user = userEvent.setup()
    render(<ThaiAddressForm onValueChange={onValueChange} />)

    await completeCascade(user)
    const houseNoInput = screen.getByLabelText('บ้านเลขที่')
    await user.type(houseNoInput, '123')
    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith({ ...expectedAddress, houseNo: '123' }),
    )

    await user.clear(houseNoInput)
    await waitFor(() => expect(onValueChange).toHaveBeenLastCalledWith(null))
  })

  it('propagates disabled to the text inputs and to the cascade triggers', async () => {
    render(<ThaiAddressForm disabled />)

    const triggers = await screen.findAllByRole('combobox')
    expect(triggers).toHaveLength(3)
    expect(isDisabled(triggers[0])).toBe(true)

    expect((screen.getByLabelText('บ้านเลขที่') as HTMLInputElement).disabled).toBe(true)
    expect((screen.getByLabelText('หมู่') as HTMLInputElement).disabled).toBe(true)
    expect((screen.getByLabelText('ซอย') as HTMLInputElement).disabled).toBe(true)
    expect((screen.getByLabelText('ถนน') as HTMLInputElement).disabled).toBe(true)
  })

  it("swaps the default ThaiAddressFormTexts labels when locale='en'", async () => {
    render(<ThaiAddressForm locale="en" />)

    await getTriggers()

    expect(screen.getByLabelText('House number')).toBeTruthy()
    expect(screen.getByLabelText('Moo')).toBeTruthy()
    expect(screen.getByLabelText('Soi')).toBeTruthy()
    expect(screen.getByLabelText('Street')).toBeTruthy()
  })

  it('forwards ref to the house-number input', async () => {
    const ref = React.createRef<HTMLInputElement>()
    render(<ThaiAddressForm ref={ref} />)

    await waitFor(() => expect(ref.current).not.toBeNull())
    ref.current?.focus()
    expect(document.activeElement).toBe(ref.current)
  })

  it('wires required only to the house-number field and the embedded cascade, not moo/soi/street', async () => {
    render(<ThaiAddressForm required />)

    const houseNoInput = screen.getByLabelText('บ้านเลขที่') as HTMLInputElement
    expect(houseNoInput.required).toBe(true)
    expect((screen.getByLabelText('หมู่') as HTMLInputElement).required).toBe(false)
    expect((screen.getByLabelText('ซอย') as HTMLInputElement).required).toBe(false)
    expect((screen.getByLabelText('ถนน') as HTMLInputElement).required).toBe(false)

    const triggers = await screen.findAllByRole('combobox')
    await waitFor(() => expect(triggers[0].getAttribute('aria-required')).toBe('true'))
  })

  describe('controlled mode: cascade-resolution/houseNo interaction order', () => {
    it('completing the cascade before typing the house number still eventually emits the full value', async () => {
      const onChange = vi.fn()
      const user = userEvent.setup()
      render(<ControlledHarness onChange={onChange} />)

      await completeCascade(user)
      const houseNoInput = screen.getByLabelText('บ้านเลขที่')
      await user.type(houseNoInput, '123')

      await waitFor(() =>
        expect(onChange).toHaveBeenLastCalledWith({ ...expectedAddress, houseNo: '123' }),
      )
    })

    it('clearing the house number after a full controlled selection, then retyping it, recovers the full value without losing the cascade selection visually', async () => {
      const onChange = vi.fn()
      const user = userEvent.setup()
      render(<ControlledHarness onChange={onChange} />)

      await completeCascade(user)
      const houseNoInput = screen.getByLabelText('บ้านเลขที่')
      await user.type(houseNoInput, '123')
      await waitFor(() =>
        expect(onChange).toHaveBeenLastCalledWith({ ...expectedAddress, houseNo: '123' }),
      )

      await user.clear(houseNoInput)
      await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(null))

      // The cascade's visible selection must survive the parent echoing `value = null` back —
      // it must not have been wiped just because the combined form value is currently null.
      const triggers = await screen.findAllByRole('combobox')
      expect(triggers[0].textContent).toContain(province.nameTh)
      expect(triggers[1].textContent).toContain(amphure.nameTh)
      expect(triggers[2].textContent).toContain(tambon.nameTh)

      await user.type(houseNoInput, '123')
      await waitFor(() =>
        expect(onChange).toHaveBeenLastCalledWith({ ...expectedAddress, houseNo: '123' }),
      )
    })
  })
})

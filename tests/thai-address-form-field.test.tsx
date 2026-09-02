// @vitest-environment jsdom
import * as React from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { loadDefaultIndex } from 'thaizip/data'
import { listAmphures, listProvinces, listTambons } from 'thaizip'
import type { AmphureSummary, ProvinceSummary, ResolvedThaiAddress, TambonSummary } from 'thaizip'
import { ThaiAddressFormField } from '../templates/react/ts/thai-address-form-field'

// Same jsdom polyfills as tests/thai-address-cascade-select.test.tsx — this component embeds
// the same Base UI Select-based cascade.
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

// No @testing-library/jest-dom in this repo — assert via plain DOM properties.
function isDisabled(el: HTMLElement): boolean {
  return (el as HTMLButtonElement).disabled || el.getAttribute('data-disabled') !== null
}

async function getTriggers() {
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

const REQUIRED_MESSAGE = 'จำเป็นต้องเลือกที่อยู่'

type FormValues = { address: ResolvedThaiAddress | null }

function Harness({ onSubmit, disabled }: { onSubmit: (values: FormValues) => void; disabled?: boolean }) {
  const { control, handleSubmit } = useForm<FormValues>({ defaultValues: { address: null } })
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <ThaiAddressFormField control={control} name="address" rules={{ required: REQUIRED_MESSAGE }} disabled={disabled} />
      <button type="submit">Submit</button>
    </form>
  )
}

describe('ThaiAddressFormField — react-hook-form Controller wrapper', () => {
  it('selects a full address through the cascade and calls the submit handler with the resolved value', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<Harness onSubmit={onSubmit} />)

    const { provinceTrigger, districtTrigger, subdistrictTrigger } = await getTriggers()
    await pickOption(user, provinceTrigger, province.nameTh)
    await waitFor(() => expect(isDisabled(districtTrigger)).toBe(false))
    await pickOption(user, districtTrigger, amphure.nameTh)
    await waitFor(() => expect(isDisabled(subdistrictTrigger)).toBe(false))
    await pickOption(user, subdistrictTrigger, tambon.nameTh)

    await user.click(screen.getByRole('button', { name: 'Submit' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({ address: expectedAddress })
  })

  it('does not call the submit handler when required and no address was selected, and surfaces the rule message', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<Harness onSubmit={onSubmit} />)

    await getTriggers()
    await user.click(screen.getByRole('button', { name: 'Submit' }))

    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(REQUIRED_MESSAGE))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("reflects RHF's fieldState.invalid via aria-invalid on the cascade's first trigger", async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<Harness onSubmit={onSubmit} />)

    const { provinceTrigger } = await getTriggers()
    expect(provinceTrigger.getAttribute('aria-invalid')).not.toBe('true')

    await user.click(screen.getByRole('button', { name: 'Submit' }))
    await waitFor(() => expect(provinceTrigger.getAttribute('aria-invalid')).toBe('true'))
  })

  it('propagates disabled through to the cascade triggers', async () => {
    render(<Harness onSubmit={vi.fn()} disabled />)

    const triggers = await screen.findAllByRole('combobox')
    expect(triggers).toHaveLength(3)
    for (const trigger of triggers) {
      expect(isDisabled(trigger)).toBe(true)
    }
  })
})

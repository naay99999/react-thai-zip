// @vitest-environment jsdom
import * as React from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { loadDefaultIndex } from 'thaizip/data'
import { listAmphures, listProvinces, listTambons } from 'thaizip'
import type { AmphureSummary, ProvinceSummary, TambonSummary } from 'thaizip'
import { ThaiAddressForm } from '../templates/react/ts/shadcn/thai-address-form'

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

describe('ThaiAddressForm (shadcn)', () => {
  it('emits a FullThaiAddress once the cascade resolves and house number is filled in', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<ThaiAddressForm onValueChange={onValueChange} />)

    await selectFullCascade(user)
    await user.type(screen.getByLabelText('บ้านเลขที่'), '123/45')

    await waitFor(() =>
      expect(onValueChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ houseNo: '123/45', subdistrict: tambon.nameTh, zipCode: tambon.zipCode }),
      ),
    )
  })

  it('keeps moo/soi/street always-optional even when required is set', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<ThaiAddressForm required onValueChange={onValueChange} />)

    expect((screen.getByLabelText('หมู่') as HTMLInputElement).required).toBe(false)
    expect((screen.getByLabelText('บ้านเลขที่') as HTMLInputElement).required).toBe(true)

    await selectFullCascade(user)
    await user.type(screen.getByLabelText('บ้านเลขที่'), '99')

    await waitFor(() => expect(onValueChange).toHaveBeenLastCalledWith(expect.objectContaining({ houseNo: '99' })))
  })
})

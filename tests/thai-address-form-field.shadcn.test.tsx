// @vitest-environment jsdom
import * as React from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { loadDefaultIndex } from 'thaizip/data'
import { listAmphures, listProvinces, listTambons } from 'thaizip'
import type { AmphureSummary, ProvinceSummary, ResolvedThaiAddress, TambonSummary } from 'thaizip'
import { ThaiAddressFormField } from '../templates/react/ts/shadcn/thai-address-form-field'

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

// Same full-cascade selection pattern as tests/thai-address-form.shadcn.test.tsx and
// tests/thai-address-cascade-select.shadcn.test.tsx: the embedded cascade only resolves (and
// calls back with) a non-null `ResolvedThaiAddress` once province, district, and sub-district
// are all picked — the brief's original single-click-on-province assertion never observed a
// full resolution, so `submitted` stayed `'null'` and the test hung until timeout.
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

afterEach(() => {
  cleanup()
})

type FormValues = { address: ResolvedThaiAddress | null }

function Harness({ required }: { required?: boolean }) {
  const { control, handleSubmit, formState } = useForm<FormValues>({ defaultValues: { address: null } })
  const [submitted, setSubmitted] = React.useState<ResolvedThaiAddress | null>()
  return (
    <form onSubmit={handleSubmit((values) => setSubmitted(values.address))}>
      <ThaiAddressFormField
        control={control}
        name="address"
        rules={required ? { required: true } : undefined}
      />
      <button type="submit">submit</button>
      {formState.errors.address && <span data-testid="rhf-error">error</span>}
      {submitted !== undefined && <span data-testid="submitted">{submitted?.province ?? 'null'}</span>}
    </form>
  )
}

describe('ThaiAddressFormField (shadcn)', () => {
  it('reports the selection back through react-hook-form on submit', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await selectFullCascade(user)

    await user.click(screen.getByRole('button', { name: 'submit' }))
    await waitFor(() => expect(screen.getByTestId('submitted').textContent).not.toBe('null'))
  })

  it('shows the role="alert" message and blocks submission when required and unselected', async () => {
    const user = userEvent.setup()
    render(<Harness required />)

    await user.click(screen.getByRole('button', { name: 'submit' }))

    await waitFor(() => expect(screen.getByTestId('rhf-error')).toBeTruthy())
    expect(screen.queryByRole('alert')).toBeTruthy()
    expect(screen.queryByTestId('submitted')).toBeNull()
  })
})

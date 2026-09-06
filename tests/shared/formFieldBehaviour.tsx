import * as React from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import type { Control, FieldPath } from 'react-hook-form'
import type { ResolvedThaiAddress } from 'thaizip'

type FormValues = { address: ResolvedThaiAddress | null }

export type FormFieldBehaviourOptions = {
  /** Label for the describe block, e.g. 'radix'. */
  engine: string
  Component: React.ComponentType<{
    control: Control<FormValues>
    name: FieldPath<FormValues>
    rules?: { required?: boolean }
  }>
  /**
   * Picks province → district → sub-district on the embedded cascade select.
   * Same rationale as `formBehaviour.tsx`'s own `selectFullCascade` — this
   * helper never queries for `role="combobox"`/`role="option"` directly.
   */
  selectFullCascade: (user: ReturnType<typeof userEvent.setup>) => Promise<void>
}

function makeHarness(Component: FormFieldBehaviourOptions['Component']) {
  return function Harness({ required }: { required?: boolean }) {
    const { control, handleSubmit, formState } = useForm<FormValues>({ defaultValues: { address: null } })
    const [submitted, setSubmitted] = React.useState<ResolvedThaiAddress | null>()
    return (
      <form onSubmit={handleSubmit((values) => setSubmitted(values.address))}>
        <Component control={control} name="address" rules={required ? { required: true } : undefined} />
        <button type="submit">submit</button>
        {formState.errors.address && <span data-testid="rhf-error">error</span>}
        {submitted !== undefined && <span data-testid="submitted">{submitted?.province ?? 'null'}</span>}
      </form>
    )
  }
}

export function describeFormFieldBehaviour(options: FormFieldBehaviourOptions): void {
  const { engine, Component, selectFullCascade } = options
  const Harness = makeHarness(Component)

  describe(`ThaiAddressFormField (${engine}) — shared behaviour`, () => {
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
}

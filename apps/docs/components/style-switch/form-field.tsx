'use client'

// What `@/components/thai-address-form-field` resolves to in docs examples;
// see ./autocomplete.tsx.
import type { FieldValues } from 'react-hook-form'
import { useDocsStyle } from '../docs-style'
import { ThaiAddressFormField as Vanilla, type ThaiAddressFormFieldProps } from '../../../../templates/react/ts/thai-address-form-field'
import { ThaiAddressFormField as Base } from '../../.generated/styles/base/thai-address-form-field'
import { ThaiAddressFormField as Radix } from '../../.generated/styles/radix/thai-address-form-field'
import { ThaiAddressFormField as Aria } from '../../.generated/styles/aria/thai-address-form-field'

export type { ThaiAddressFormFieldProps } from '../../../../templates/react/ts/thai-address-form-field'

const STYLES = { vanilla: Vanilla, base: Base, radix: Radix, aria: Aria }

export function ThaiAddressFormField<TFieldValues extends FieldValues = FieldValues>(
  props: ThaiAddressFormFieldProps<TFieldValues>,
) {
  const Component = STYLES[useDocsStyle().style] as typeof Vanilla<TFieldValues>
  return <Component {...props} />
}

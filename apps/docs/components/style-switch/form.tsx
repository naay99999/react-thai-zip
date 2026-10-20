'use client'

// What `@/components/thai-address-form` resolves to in docs examples; see
// ./autocomplete.tsx.
import { useDocsStyle } from '../docs-style'
import { ThaiAddressForm as Vanilla, type ThaiAddressFormProps } from '../../../../templates/react/ts/thai-address-form'
import { ThaiAddressForm as Base } from '../../.generated/styles/base/thai-address-form'
import { ThaiAddressForm as Radix } from '../../.generated/styles/radix/thai-address-form'
import { ThaiAddressForm as Aria } from '../../.generated/styles/aria/thai-address-form'

export type { FullThaiAddress, ThaiAddressFormProps, ThaiAddressFormTexts } from '../../../../templates/react/ts/thai-address-form'

const STYLES = { vanilla: Vanilla, base: Base, radix: Radix, aria: Aria } as Record<string, typeof Vanilla>

export function ThaiAddressForm(props: ThaiAddressFormProps) {
  const Component = STYLES[useDocsStyle().style]
  return <Component {...props} />
}

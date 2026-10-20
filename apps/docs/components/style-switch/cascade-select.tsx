'use client'

// What `@/components/thai-address-cascade-select` resolves to in docs examples;
// see ./autocomplete.tsx.
import { useDocsStyle } from '../docs-style'
import { ThaiAddressCascadeSelect as Vanilla, type ThaiAddressCascadeSelectProps } from '../../../../templates/react/ts/thai-address-cascade-select'
import { ThaiAddressCascadeSelect as Base } from '../../.generated/styles/base/thai-address-cascade-select'
import { ThaiAddressCascadeSelect as Radix } from '../../.generated/styles/radix/thai-address-cascade-select'
import { ThaiAddressCascadeSelect as Aria } from '../../.generated/styles/aria/thai-address-cascade-select'

export type { ThaiAddressCascadeSelectProps, ThaiAddressCascadeSelectTexts } from '../../../../templates/react/ts/thai-address-cascade-select'

const STYLES = { vanilla: Vanilla, base: Base, radix: Radix, aria: Aria } as Record<string, typeof Vanilla>

export function ThaiAddressCascadeSelect(props: ThaiAddressCascadeSelectProps) {
  const Component = STYLES[useDocsStyle().style]
  return <Component {...props} />
}

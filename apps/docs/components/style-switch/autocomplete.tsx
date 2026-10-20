'use client'

// What `@/components/thai-address-autocomplete` resolves to in docs examples:
// the template for the style picked on the site, so one example file (whose
// source is what readers copy) previews every style.
import { useDocsStyle } from '../docs-style'
import { ThaiAddressAutocomplete as Vanilla, type ThaiAddressAutocompleteProps } from '../../../../templates/react/ts/thai-address-autocomplete'
import { ThaiAddressAutocomplete as Base } from '../../.generated/styles/base/thai-address-autocomplete'
import { ThaiAddressAutocomplete as Radix } from '../../.generated/styles/radix/thai-address-autocomplete'
import { ThaiAddressAutocomplete as Aria } from '../../.generated/styles/aria/thai-address-autocomplete'

export type { ThaiAddressAutocompleteProps } from '../../../../templates/react/ts/thai-address-autocomplete'

// The shadcn variants' props match vanilla's except where an element type
// differs (e.g. the shadcn autocomplete's onBlur targets its trigger button);
// the examples don't rely on those, so they're typed as the vanilla props.
const STYLES = { vanilla: Vanilla, base: Base, radix: Radix, aria: Aria } as Record<string, typeof Vanilla>

export function ThaiAddressAutocomplete(props: ThaiAddressAutocompleteProps) {
  const Component = STYLES[useDocsStyle().style]
  return <Component {...props} />
}

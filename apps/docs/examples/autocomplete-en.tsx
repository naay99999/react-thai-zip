'use client'

import { ThaiAddressAutocomplete } from '@/components/thai-address-autocomplete'

export default function AutocompleteEn() {
  return <ThaiAddressAutocomplete locale="en" onValueChange={(address) => console.log(address)} />
}

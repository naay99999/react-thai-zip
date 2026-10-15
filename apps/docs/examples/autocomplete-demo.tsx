'use client'

import { ThaiAddressAutocomplete } from '@/components/thai-address-autocomplete'

export default function AutocompleteDemo() {
  return <ThaiAddressAutocomplete onValueChange={(address) => console.log(address)} />
}

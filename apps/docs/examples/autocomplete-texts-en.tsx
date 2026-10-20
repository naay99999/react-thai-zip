import { ThaiAddressAutocomplete } from '@/components/thai-address-autocomplete'

export default function AutocompleteTextsEn() {
  return (
    <ThaiAddressAutocomplete
      locale="en"
      texts={{
        placeholder: 'Search by postal code, e.g. 10110',
        emptyText: 'No match. Try a district name instead.',
      }}
    />
  )
}

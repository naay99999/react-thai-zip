import { ThaiAddressAutocomplete } from '@/components/thai-address-autocomplete'

export default function AutocompleteStyledEn() {
  return (
    <ThaiAddressAutocomplete
      locale="en"
      inputClassName="rounded-full"
      popupClassName="rounded-2xl"
      itemClassName="rounded-xl"
    />
  )
}

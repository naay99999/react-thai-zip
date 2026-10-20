import { ThaiAddressForm } from '@/components/thai-address-form'

export default function AddressFormTextsEn() {
  return (
    <ThaiAddressForm
      locale="en"
      texts={{
        houseNoLabel: 'House / unit no.',
        houseNoPlaceholder: 'e.g. 99/9, unit 1203',
        streetLabel: 'Building / road',
      }}
    />
  )
}

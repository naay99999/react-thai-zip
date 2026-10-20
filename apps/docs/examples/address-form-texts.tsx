import { ThaiAddressForm } from '@/components/thai-address-form'

export default function AddressFormTexts() {
  return (
    <ThaiAddressForm
      texts={{
        houseNoLabel: 'บ้านเลขที่ / ห้อง',
        houseNoPlaceholder: 'เช่น 99/9 ห้อง 1203',
        streetLabel: 'อาคาร / ถนน',
      }}
    />
  )
}

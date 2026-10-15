'use client'

import { ThaiAddressForm } from '@/components/thai-address-form'

export default function AddressFormEn() {
  return <ThaiAddressForm locale="en" onValueChange={(address) => console.log(address)} />
}

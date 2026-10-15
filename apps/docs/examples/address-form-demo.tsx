'use client'

import { ThaiAddressForm } from '@/components/thai-address-form'

export default function AddressFormDemo() {
  return <ThaiAddressForm onValueChange={(address) => console.log(address)} />
}

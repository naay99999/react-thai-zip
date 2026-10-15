'use client'

import { ThaiAddressCascadeSelect } from '@/components/thai-address-cascade-select'

export default function CascadeSelectEn() {
  return <ThaiAddressCascadeSelect locale="en" onValueChange={(address) => console.log(address)} />
}

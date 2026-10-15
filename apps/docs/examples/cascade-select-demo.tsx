'use client'

import { ThaiAddressCascadeSelect } from '@/components/thai-address-cascade-select'

export default function CascadeSelectDemo() {
  return <ThaiAddressCascadeSelect onValueChange={(address) => console.log(address)} />
}

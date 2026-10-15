'use client'

import { useForm } from 'react-hook-form'
import type { ResolvedThaiAddress } from 'thaizip'
import { ThaiAddressFormField } from '@/components/thai-address-form-field'

type FormValues = {
  address: ResolvedThaiAddress | null
}

export default function AddressFormFieldDisabled() {
  const { control } = useForm<FormValues>({ defaultValues: { address: null } })

  return <ThaiAddressFormField control={control} name="address" disabled />
}

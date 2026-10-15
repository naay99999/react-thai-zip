'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { ResolvedThaiAddress } from 'thaizip'
import { ThaiAddressFormField } from '@/components/thai-address-form-field'

type FormValues = {
  address: ResolvedThaiAddress | null
}

export default function AddressFormFieldDemo() {
  const { control, handleSubmit } = useForm<FormValues>({ defaultValues: { address: null } })
  const [submitted, setSubmitted] = useState<ResolvedThaiAddress | null>(null)

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit((data) => setSubmitted(data.address))}>
      <ThaiAddressFormField
        control={control}
        name="address"
      />
      <div>
        <button type="submit" className="rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent">
          ส่งฟอร์ม
        </button>
      </div>
      <p className="text-sm font-medium">ค่าที่ส่ง</p>
      <pre className="max-h-72 overflow-auto rounded-md border bg-muted p-3 text-xs">{JSON.stringify(submitted, null, 2)}</pre>
    </form>
  )
}

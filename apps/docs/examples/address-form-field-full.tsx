'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { ResolvedThaiAddress } from 'thaizip'
import { ThaiAddressFormField } from '@/components/thai-address-form-field'

type FormValues = {
  name: string
  address: ResolvedThaiAddress | null
}

export default function AddressFormFieldFull() {
  const { control, register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    defaultValues: { name: '', address: null },
  })
  const [submitted, setSubmitted] = useState<FormValues | null>(null)

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(setSubmitted)}>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        ชื่อ-นามสกุล
        <input
          {...register('name', { required: 'กรุณากรอกชื่อ' })}
          aria-invalid={errors.name ? true : undefined}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        />
        {errors.name && <span role="alert" className="text-sm font-normal text-destructive">{errors.name.message}</span>}
      </label>
      <ThaiAddressFormField
        control={control}
        name="address"
        rules={{ validate: (value) => value !== null || 'กรุณาเลือกที่อยู่ให้ครบ' }}
      />
      <div>
        <button type="submit" className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          สมัครสมาชิก
        </button>
      </div>
      <p className="text-sm font-medium">ค่าที่ส่ง</p>
      <pre className="max-h-72 overflow-auto rounded-md border bg-muted p-3 text-xs">{JSON.stringify(submitted, null, 2)}</pre>
    </form>
  )
}

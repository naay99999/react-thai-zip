'use client'

import { useState, type FormEvent } from 'react'
import { ThaiAddressForm } from '@/components/thai-address-form'

export default function AddressFormSubmit() {
  const [payload, setPayload] = useState<Record<string, FormDataEntryValue> | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPayload(Object.fromEntries(new FormData(event.currentTarget)))
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} onReset={() => setPayload(null)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          ชื่อผู้รับ
          <input name="recipient" required className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          เบอร์โทรศัพท์
          <input name="phone" type="tel" required className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
        </label>
      </div>
      <ThaiAddressForm name="address" required />
      <div className="flex justify-end gap-2">
        <button type="reset" className="rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent">
          ยกเลิก
        </button>
        <button type="submit" className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          บันทึกที่อยู่
        </button>
      </div>
      <p className="text-sm font-medium">FormData ที่ส่ง</p>
      <pre className="max-h-72 overflow-auto rounded-md border bg-muted p-3 text-xs">{JSON.stringify(payload, null, 2)}</pre>
    </form>
  )
}

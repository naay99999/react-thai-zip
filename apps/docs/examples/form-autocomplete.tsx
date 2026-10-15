'use client'

import { useRef, useState, type FormEvent } from 'react'
import { ThaiAddressAutocomplete } from '@/components/thai-address-autocomplete'

export default function FormAutocomplete() {
  const ref = useRef<HTMLInputElement>(null)
  const [payload, setPayload] = useState<Record<string, FormDataEntryValue> | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPayload(Object.fromEntries(new FormData(event.currentTarget)))
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <ThaiAddressAutocomplete
        ref={ref}
        name="address"
        required
      />
      <div className="flex gap-2">
        <button type="button" className="rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent" onClick={() => ref.current?.focus()}>
          โฟกัสช่องที่อยู่
        </button>
        <button type="submit" className="rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent">
          ส่งฟอร์ม
        </button>
      </div>
      <p className="text-sm font-medium">FormData ที่ส่ง</p>
      <pre className="max-h-72 overflow-auto rounded-md border bg-muted p-3 text-xs">{JSON.stringify(payload, null, 2)}</pre>
    </form>
  )
}

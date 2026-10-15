'use client'

import { useState } from 'react'
import type { ResolvedThaiAddress } from 'thaizip'
import { ThaiAddressAutocomplete } from '@/components/thai-address-autocomplete'

export default function AutocompleteControlledEn() {
  const [address, setAddress] = useState<ResolvedThaiAddress | null>(null)

  return (
    <div className="flex flex-col gap-3">
      <ThaiAddressAutocomplete locale="en" value={address} onValueChange={setAddress} />
      <div>
        <button type="button" className="rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent" onClick={() => setAddress(null)}>
          Clear
        </button>
      </div>
      <p className="text-sm font-medium">Current value</p>
      <pre className="max-h-72 overflow-auto rounded-md border bg-muted p-3 text-xs">{JSON.stringify(address, null, 2)}</pre>
    </div>
  )
}

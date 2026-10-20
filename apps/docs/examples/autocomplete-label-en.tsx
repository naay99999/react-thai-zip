import { ThaiAddressAutocomplete } from '@/components/thai-address-autocomplete'

export default function AutocompleteLabelEn() {
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-2 text-sm font-medium">
        Shipping address
        <ThaiAddressAutocomplete locale="en" />
      </label>
      <p className="text-sm text-muted-foreground">Type a sub-district, district, or postal code, then pick a result.</p>
    </div>
  )
}

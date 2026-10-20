import { ThaiAddressAutocomplete } from '@/components/thai-address-autocomplete'

export default function AutocompleteLabel() {
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-2 text-sm font-medium">
        ที่อยู่จัดส่ง
        <ThaiAddressAutocomplete />
      </label>
      <p className="text-sm text-muted-foreground">พิมพ์ตำบล อำเภอ หรือรหัสไปรษณีย์ แล้วเลือกจากรายการ</p>
    </div>
  )
}

import { ThaiAddressAutocomplete } from '@/components/thai-address-autocomplete'

export default function AutocompleteTexts() {
  return (
    <ThaiAddressAutocomplete
      texts={{
        placeholder: 'ค้นหาจากรหัสไปรษณีย์ เช่น 10110',
        emptyText: 'ไม่พบที่อยู่นี้ ลองพิมพ์ชื่ออำเภอแทน',
      }}
    />
  )
}

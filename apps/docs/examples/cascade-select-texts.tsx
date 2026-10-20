import { ThaiAddressCascadeSelect } from '@/components/thai-address-cascade-select'

export default function CascadeSelectTexts() {
  return (
    <ThaiAddressCascadeSelect
      texts={{
        provinceLabel: 'จังหวัดที่จัดส่ง',
        provincePlaceholder: 'เลือกจังหวัด',
        districtLabel: 'เขต/อำเภอ',
        subdistrictLabel: 'แขวง/ตำบล',
      }}
    />
  )
}

import { ThaiAddressCascadeSelect } from '@/components/thai-address-cascade-select'

export default function CascadeSelectTextsEn() {
  return (
    <ThaiAddressCascadeSelect
      locale="en"
      texts={{
        provinceLabel: 'Delivery province',
        provincePlaceholder: 'Choose a province',
        districtLabel: 'District / khet',
        subdistrictLabel: 'Sub-district / khwaeng',
      }}
    />
  )
}

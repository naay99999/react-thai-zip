import { ThaiAddressDisplay, type ThaiAddressDisplayValue } from '@/components/thai-address-display'

const address: ThaiAddressDisplayValue = {
  tambon: 'คลองตันเหนือ',
  tambonEn: 'Khlong Tan Nuea',
  amphure: 'วัฒนา',
  amphureEn: 'Watthana',
  province: 'กรุงเทพมหานคร',
  provinceEn: 'Bangkok',
  zipCode: '10110',
  subdistrict: 'คลองตันเหนือ',
  subdistrictEn: 'Khlong Tan Nuea',
  district: 'วัฒนา',
  districtEn: 'Watthana',
  postalCode: '10110',
  houseNo: '99/9',
  moo: '4',
  soi: '2',
  street: 'สุขุมวิท',
}

export default function AddressDisplayMultiLineEn() {
  return <ThaiAddressDisplay value={address} locale="en" mode="multi-line" />
}

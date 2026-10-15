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
}

export default function AddressDisplayMinimal() {
  return <ThaiAddressDisplay value={address} />
}

import type { ThaiAddressDisplayValue } from '@/thai-address-display'
import { ThaiAddressDisplay } from '@/thai-address-display'
import { DemoFrame, type DemoLocale } from './demo-shared'

const SAMPLE_ADDRESS: ThaiAddressDisplayValue = {
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

export type AddressDisplayDemoProps = {
  locale?: DemoLocale
  mode?: 'single-line' | 'multi-line'
  variant?: 'full' | 'minimal' | 'empty'
}

export function AddressDisplayDemo({
  locale = 'th',
  mode = 'single-line',
  variant = 'full',
}: AddressDisplayDemoProps) {
  const value: ThaiAddressDisplayValue | null =
    variant === 'empty'
      ? null
      : variant === 'minimal'
        ? { ...SAMPLE_ADDRESS, houseNo: undefined, moo: undefined, soi: undefined, street: undefined }
        : SAMPLE_ADDRESS
  const copy =
    locale === 'en'
      ? { title: 'Address display', description: 'A read-only formatter for a resolved (optionally full) address.' }
      : { title: 'แสดงที่อยู่', description: 'ตัวจัดรูปแบบที่อยู่แบบอ่านอย่างเดียว จากที่อยู่ที่เลือกครบแล้ว (จะมีบ้านเลขที่หรือไม่ก็ได้)' }

  return (
    <DemoFrame title={copy.title} description={copy.description}>
      <ThaiAddressDisplay value={value} locale={locale} mode={mode} />
    </DemoFrame>
  )
}

export default AddressDisplayDemo

export type LocaleCode = 'th'

const th: Record<string, Record<string, string>> = {
  ThaiAddressAutocomplete: {
    placeholder: 'พิมพ์ตำบล อำเภอ จังหวัด หรือรหัสไปรษณีย์',
    clearAriaLabel: 'ล้างที่อยู่',
    loadingText: 'กำลังโหลด...',
    errorText: 'โหลดข้อมูลที่อยู่ไม่สำเร็จ',
  },
  ThaiAddressPostalCodeForm: {
    postalCodeLabel: 'รหัสไปรษณีย์',
    subdistrictLabel: 'ตำบล/แขวง',
    districtLabel: 'อำเภอ/เขต',
    provinceLabel: 'จังหวัด',
    clearLabel: 'ล้าง',
    loadingText: 'กำลังโหลด...',
    errorText: 'โหลดข้อมูลที่อยู่ไม่สำเร็จ',
  },
  ThaiAddressCascadeSelect: {
    provinceLabel: 'จังหวัด',
    districtLabel: 'อำเภอ/เขต',
    subdistrictLabel: 'ตำบล/แขวง',
    postalCodeLabel: 'รหัสไปรษณีย์',
    selectProvinceOption: 'เลือกจังหวัด',
    selectDistrictOption: 'เลือกอำเภอ',
    selectSubdistrictOption: 'เลือกตำบล',
    loadingText: 'กำลังโหลด...',
    errorText: 'โหลดข้อมูลที่อยู่ไม่สำเร็จ',
  },
  ThaiAddressDisplayFields: {
    subdistrictLabel: 'ตำบล/แขวง',
    districtLabel: 'อำเภอ/เขต',
    provinceLabel: 'จังหวัด',
    postalCodeLabel: 'รหัสไปรษณีย์',
  },
}

const locales: Record<LocaleCode, Record<string, Record<string, string>>> = { th }

export function getLocaleTexts(lang: string, componentName: string): Record<string, string> | undefined {
  return locales[lang as LocaleCode]?.[componentName]
}

export function localizeDefaultTexts(content: string, lang: string, componentName: string): string {
  const texts = getLocaleTexts(lang, componentName)
  if (!texts) {
    return content
  }

  let localized = content
  for (const [key, value] of Object.entries(texts)) {
    localized = localized.replace(new RegExp(`(^\\s*${key}: )'[^']*'`, 'm'), `$1'${value}'`)
  }
  return localized
}

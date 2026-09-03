'use client'

import { useState } from 'react'
import type { FullThaiAddress } from '@/thai-address-form'
import { ThaiAddressForm } from '@/thai-address-form'
import { DemoFrame, DemoOutput, type DemoLocale } from './demo-shared'

export type AddressFormDemoProps = {
  locale?: DemoLocale
  mode?: 'uncontrolled' | 'controlled'
  disabled?: boolean
  invalid?: boolean
  showOutput?: boolean
}

export function AddressFormDemo({
  locale = 'th',
  mode = 'uncontrolled',
  disabled = false,
  invalid = false,
  showOutput = false,
}: AddressFormDemoProps) {
  const [value, setValue] = useState<FullThaiAddress | null>(null)
  const controlledProps = mode === 'controlled' ? { value } : {}
  const copy =
    locale === 'en'
      ? {
          title: 'Address form',
          description: 'Enter a house number plus moo/soi/street, then choose the province, district, and sub-district.',
          output: 'Callback value',
          clear: 'Clear selection',
        }
      : {
          title: 'ฟอร์มที่อยู่แบบเต็ม',
          description: 'กรอกบ้านเลขที่พร้อมหมู่/ซอย/ถนน แล้วเลือกจังหวัด อำเภอ/เขต และตำบล/แขวง',
          output: 'ค่าจาก callback',
          clear: 'ล้างที่อยู่ที่เลือก',
        }

  return (
    <DemoFrame title={copy.title} description={copy.description}>
      <ThaiAddressForm
        {...controlledProps}
        locale={locale}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        onValueChange={setValue}
      />
      {mode === 'controlled' && (
        <div className="tz-demo-actions">
          <button className="tz-demo-action" type="button" onClick={() => setValue(null)}>
            {copy.clear}
          </button>
        </div>
      )}
      {showOutput && <DemoOutput label={copy.output} value={value} />}
    </DemoFrame>
  )
}

export default AddressFormDemo

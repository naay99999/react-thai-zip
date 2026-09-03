'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { ResolvedThaiAddress } from 'thaizip'
import { ThaiAddressFormField } from '@/thai-address-form-field'
import { DemoFrame, DemoOutput, type DemoLocale } from './demo-shared'

type DemoFormValues = {
  address: ResolvedThaiAddress | null
}

export type AddressFormFieldDemoProps = {
  locale?: DemoLocale
  required?: boolean
  disabled?: boolean
  showOutput?: boolean
}

export function AddressFormFieldDemo({
  locale = 'th',
  required = false,
  disabled = false,
  showOutput = false,
}: AddressFormFieldDemoProps) {
  const { control, handleSubmit } = useForm<DemoFormValues>({ defaultValues: { address: null } })
  const [submitted, setSubmitted] = useState<ResolvedThaiAddress | null>(null)
  const copy =
    locale === 'en'
      ? {
          title: 'Form field (react-hook-form)',
          description: 'A Controller-wrapped cascade select, validated and submitted through react-hook-form.',
          submit: 'Submit form',
          required: 'Please select a complete address.',
          output: 'Submitted value',
        }
      : {
          title: 'ฟิลด์ในฟอร์ม (react-hook-form)',
          description: 'cascade select ที่ครอบด้วย Controller ตรวจสอบและส่งค่าผ่าน react-hook-form',
          submit: 'ส่งฟอร์ม',
          required: 'กรุณาเลือกที่อยู่ให้ครบ',
          output: 'ค่าที่ส่งไป',
        }

  return (
    <DemoFrame title={copy.title} description={copy.description}>
      <form
        className="flex flex-col gap-3"
        onSubmit={handleSubmit((data) => setSubmitted(data.address))}
      >
        <ThaiAddressFormField
          control={control}
          name="address"
          locale={locale}
          disabled={disabled}
          rules={required ? { validate: (value) => value !== null || copy.required } : undefined}
        />
        <div className="tz-demo-actions">
          <button className="tz-demo-action" type="submit">
            {copy.submit}
          </button>
        </div>
      </form>
      {showOutput && <DemoOutput label={copy.output} value={submitted} />}
    </DemoFrame>
  )
}

export default AddressFormFieldDemo

import { useState } from 'react'
import type { ResolvedThaiAddress } from 'thaizip'
import { ThaiAddressCascadeSelect } from '@/thai-address-cascade-select'
import { DemoFrame, DemoOutput, type DemoLocale } from './demo-shared'

export type CascadeSelectDemoProps = {
  locale?: DemoLocale
  mode?: 'uncontrolled' | 'controlled'
  disabled?: boolean
  invalid?: boolean
  showOutput?: boolean
}

export function CascadeSelectDemo({
  locale = 'th',
  mode = 'uncontrolled',
  disabled = false,
  invalid = false,
  showOutput = false,
}: CascadeSelectDemoProps) {
  const [value, setValue] = useState<ResolvedThaiAddress | null>(null)
  const controlledProps = mode === 'controlled' ? { value } : {}
  const copy =
    locale === 'en'
      ? {
          title: 'Address cascade select',
          description: 'Choose a province, district, and sub-district in order.',
          output: 'Callback value',
          clear: 'Clear selection',
        }
      : {
          title: 'เลือกที่อยู่แบบลำดับชั้น',
          description: 'เลือกจังหวัด อำเภอ/เขต และตำบล/แขวงตามลำดับ',
          output: 'ค่าจาก callback',
          clear: 'ล้างที่อยู่ที่เลือก',
        }

  return (
    <DemoFrame title={copy.title} description={copy.description}>
      <ThaiAddressCascadeSelect
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

export default CascadeSelectDemo

'use client'

import { useState } from 'react'
import type { ResolvedThaiAddress } from 'thaizip'
import { ThaiAddressAutocomplete } from '@/thai-address-autocomplete'
import { DemoFrame, DemoOutput, type DemoLocale } from './demo-shared'

export type AutocompleteDemoProps = {
  locale?: DemoLocale
  mode?: 'uncontrolled' | 'controlled'
  disabled?: boolean
  invalid?: boolean
  showOutput?: boolean
}

export function AutocompleteDemo({
  locale = 'th',
  mode = 'uncontrolled',
  disabled = false,
  invalid = false,
  showOutput = false,
}: AutocompleteDemoProps) {
  const [value, setValue] = useState<ResolvedThaiAddress | null>(null)
  const controlledProps = mode === 'controlled' ? { value } : {}
  const copy =
    locale === 'en'
      ? {
          title: 'Address autocomplete',
          description: 'Search for a Thai address by typing any part of it.',
          output: 'Selected address',
          clear: 'Clear selection',
        }
      : {
          title: 'ค้นหาที่อยู่',
          description: 'ค้นหาที่อยู่ไทยด้วยการพิมพ์ข้อมูลส่วนใดส่วนหนึ่งของที่อยู่',
          output: 'ที่อยู่ที่เลือก',
          clear: 'ล้างที่อยู่ที่เลือก',
        }

  return (
    <DemoFrame title={copy.title} description={copy.description}>
      <ThaiAddressAutocomplete
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

export default AutocompleteDemo

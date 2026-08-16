import { useRef, useState, type FormEvent } from 'react'
import type { ResolvedThaiAddress } from 'thaizip'
import { ThaiAddressAutocomplete } from '@/thai-address-autocomplete'
import { ThaiAddressCascadeSelect } from '@/thai-address-cascade-select'
import { DemoFrame, DemoOutput, type DemoLocale } from './demo-shared'

export type FormDemoProps = {
  locale?: DemoLocale
  component?: 'autocomplete' | 'cascade-select'
}

export function FormDemo({ locale = 'th', component = 'autocomplete' }: FormDemoProps) {
  const autocompleteRef = useRef<HTMLInputElement>(null)
  const cascadeRef = useRef<HTMLButtonElement>(null)
  const [value, setValue] = useState<ResolvedThaiAddress | null>(null)
  const [payload, setPayload] = useState<Record<string, FormDataEntryValue> | null>(null)
  const [blurCount, setBlurCount] = useState(0)
  const copy =
    locale === 'en'
      ? {
          title: 'Form integration',
          description: 'Submit the address component’s hidden fields with a regular browser form.',
          focus: 'Focus address control',
          submit: 'Submit form',
          output: 'Submitted fields',
          blur: 'Blur count',
          selected: 'Current address:',
          empty: 'No address selected yet.',
        }
      : {
          title: 'การใช้งานร่วมกับฟอร์ม',
          description: 'ส่งค่า hidden fields ของคอมโพเนนต์ที่อยู่ด้วยฟอร์มของเบราว์เซอร์ปกติ',
          focus: 'โฟกัสช่องกรอกที่อยู่',
          submit: 'ส่งฟอร์ม',
          output: 'ข้อมูลที่ส่ง',
          blur: 'จำนวนครั้งที่ blur',
          selected: 'ที่อยู่ปัจจุบัน:',
          empty: 'ยังไม่ได้เลือกที่อยู่',
        }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = Object.fromEntries(new FormData(event.currentTarget).entries())
    setPayload(data)
  }

  const focusControl = () => {
    if (component === 'autocomplete') autocompleteRef.current?.focus()
    else cascadeRef.current?.focus()
  }

  const selectedAddress =
    value === null
      ? null
      : locale === 'en'
        ? `${value.subdistrictEn}, ${value.districtEn}, ${value.provinceEn} ${value.zipCode}`
        : `${value.subdistrict}, ${value.district}, ${value.province} ${value.zipCode}`

  return (
    <DemoFrame title={copy.title} description={copy.description}>
      <form onSubmit={handleSubmit}>
        {component === 'autocomplete' ? (
          <ThaiAddressAutocomplete
            ref={autocompleteRef}
            name="address"
            required
            locale={locale}
            onBlur={() => setBlurCount((count) => count + 1)}
            onValueChange={setValue}
          />
        ) : (
          <ThaiAddressCascadeSelect
            ref={cascadeRef}
            name="address"
            required
            locale={locale}
            onBlur={() => setBlurCount((count) => count + 1)}
            onValueChange={setValue}
          />
        )}
        <div className="tz-demo-actions">
          <button className="tz-demo-action" type="button" onClick={focusControl}>
            {copy.focus}
          </button>
          <button className="tz-demo-action" type="submit">
            {copy.submit}
          </button>
        </div>
      </form>
      <p>
        {copy.blur}: {blurCount}. {selectedAddress ? `${copy.selected} ${selectedAddress}` : copy.empty}
      </p>
      <DemoOutput label={copy.output} value={payload} />
    </DemoFrame>
  )
}

export default FormDemo

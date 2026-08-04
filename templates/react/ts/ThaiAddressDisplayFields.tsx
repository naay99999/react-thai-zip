import type { ResolvedThaiAddress } from 'thaizip'

type DisplayField = 'subdistrict' | 'district' | 'province' | 'postalCode'
type DisplayMode = 'fields' | 'inline'

type Texts = {
  subdistrictLabel: string
  districtLabel: string
  provinceLabel: string
  postalCodeLabel: string
}

const defaultTexts: Texts = {
  subdistrictLabel: 'Sub District',
  districtLabel: 'District',
  provinceLabel: 'Province',
  postalCodeLabel: 'Postal Code',
}

type Props = {
  address: ResolvedThaiAddress | null
  texts?: Partial<Texts>
  mode?: DisplayMode
  order?: DisplayField[]
  separator?: string
  containerClassName?: string
  fieldClassName?: string
  labelClassName?: string
  inputClassName?: string
}

const defaultOrder: DisplayField[] = ['subdistrict', 'district', 'province', 'postalCode']

function joinClassNames(...classes: Array<string | undefined | false>): string {
  return classes.filter(Boolean).join(' ')
}

export function ThaiAddressDisplayFields({
  address,
  texts,
  mode = 'fields',
  order = defaultOrder,
  separator = ' > ',
  containerClassName,
  fieldClassName,
  labelClassName,
  inputClassName,
}: Props) {
  const t: Texts = { ...defaultTexts, ...texts }
  const fieldLabels: Record<DisplayField, string> = {
    subdistrict: t.subdistrictLabel,
    district: t.districtLabel,
    province: t.provinceLabel,
    postalCode: t.postalCodeLabel,
  }

  const readOnlyClass = joinClassNames(
    'w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300',
    inputClassName,
  )

  if (mode === 'inline') {
    return (
      <input
        className={readOnlyClass}
        value={formatInlineAddress(address, order, separator)}
        readOnly
      />
    )
  }

  return (
    <div className={joinClassNames('grid grid-cols-2 gap-4', containerClassName)}>
      {order.map((field) => (
        <div className={joinClassNames('space-y-1', fieldClassName)} key={field}>
          <label className={joinClassNames('text-sm font-semibold text-slate-900 dark:text-slate-100', labelClassName)}>{fieldLabels[field]}</label>
          <input className={readOnlyClass} value={getFieldValue(address, field)} readOnly />
        </div>
      ))}
    </div>
  )
}

function getFieldValue(address: ResolvedThaiAddress | null, field: DisplayField): string {
  return address?.[field] ?? ''
}

function formatInlineAddress(address: ResolvedThaiAddress | null, order: DisplayField[], separator: string): string {
  if (!address) return ''

  const fields = order.map((field) => ({
    field,
    value: getFieldValue(address, field),
  })).filter((item) => item.value)

  if (fields.length === 0) return ''

  const lastField = fields[fields.length - 1]
  if (lastField.field !== 'postalCode') {
    return fields.map((item) => item.value).join(separator)
  }

  const addressFields = fields.slice(0, -1).map((item) => item.value)
  if (addressFields.length === 0) return lastField.value

  return `${addressFields.join(separator)} ${lastField.value}`
}

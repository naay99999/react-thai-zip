import type { ResolvedThaiAddress } from 'thaizip'

type DisplayField = 'subdistrict' | 'district' | 'province' | 'postalCode'
type DisplayMode = 'fields' | 'inline'

type Props = {
  address: ResolvedThaiAddress | null
  mode?: DisplayMode
  order?: DisplayField[]
  separator?: string
}

const defaultOrder: DisplayField[] = ['subdistrict', 'district', 'province', 'postalCode']

const fieldLabels: Record<DisplayField, string> = {
  subdistrict: 'Sub District',
  district: 'District',
  province: 'Province',
  postalCode: 'Postal Code',
}

export function ThaiAddressDisplayFields({
  address,
  mode = 'fields',
  order = defaultOrder,
  separator = ' > ',
}: Props) {
  if (mode === 'inline') {
    return (
      <input
        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 outline-none"
        value={formatInlineAddress(address, order, separator)}
        readOnly
      />
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {order.map((field) => (
        <div className="space-y-1" key={field}>
          <label className="text-sm font-semibold">{fieldLabels[field]}</label>
          <input className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 outline-none" value={getFieldValue(address, field)} readOnly />
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

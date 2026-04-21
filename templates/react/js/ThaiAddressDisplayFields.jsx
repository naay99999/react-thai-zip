const defaultOrder = ['subdistrict', 'district', 'province', 'postalCode']

const fieldLabels = {
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
}) {
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

function getFieldValue(address, field) {
  return address?.[field] ?? ''
}

function formatInlineAddress(address, order, separator) {
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

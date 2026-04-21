import { getComponentTemplateFile, resolveRegistryComponent } from '../src/registry.js'

describe('registry', () => {
  it.each([
    ['autocomplete', 'ThaiAddressAutocomplete'],
    ['ThaiAddressAutocomplete', 'ThaiAddressAutocomplete'],
    ['postal-form', 'ThaiAddressPostalCodeForm'],
    ['ThaiAddressPostalForm', 'ThaiAddressPostalCodeForm'],
    ['ThaiAddressForm', 'ThaiAddressPostalCodeForm'],
    ['fields', 'ThaiAddressDisplayFields'],
    ['ThaiAddressSearch', 'ThaiAddressDisplayFields'],
    ['cascade-select', 'ThaiAddressCascadeSelect'],
  ])('resolves %s to %s', (alias, expected) => {
    expect(resolveRegistryComponent(alias)?.name).toBe(expected)
  })

  it('returns the correct template filename for each language', () => {
    const component = resolveRegistryComponent('ThaiAddressPostalForm')
    expect(component).toBeDefined()
    expect(getComponentTemplateFile(component!, 'ts')).toBe('ThaiAddressPostalCodeForm.tsx')
    expect(getComponentTemplateFile(component!, 'js')).toBe('ThaiAddressPostalCodeForm.jsx')
  })
})

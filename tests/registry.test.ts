import { getComponentTemplateFile, registryComponents, resolveRegistryComponent } from '../src/registry.js'

describe('registry', () => {
  it.each([
    ['autocomplete', 'ThaiAddressAutocomplete'],
    ['ThaiAddressAutocomplete', 'ThaiAddressAutocomplete'],
    ['cascade', 'ThaiAddressCascadeSelect'],
    ['cascade-select', 'ThaiAddressCascadeSelect'],
  ])('resolves %s to %s', (alias, expected) => {
    expect(resolveRegistryComponent(alias)?.name).toBe(expected)
  })

  it('exposes only the two supported components', () => {
    expect(registryComponents.map((component) => component.name)).toEqual([
      'ThaiAddressAutocomplete',
      'ThaiAddressCascadeSelect',
    ])
  })

  it('returns the .tsx template filename for a component', () => {
    const component = resolveRegistryComponent('autocomplete')
    expect(component).toBeDefined()
    expect(getComponentTemplateFile(component!)).toBe('ThaiAddressAutocomplete.tsx')
  })
})

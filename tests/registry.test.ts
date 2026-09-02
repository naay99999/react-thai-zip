import { describe, expect, it } from 'vitest'
import { registryItems, resolveRegistryItem, resolveWithDependencies, type RegistryItem } from '../src/registry.js'

describe('registry', () => {
  it.each([
    ['autocomplete', 'autocomplete'],
    ['ThaiAddressAutocomplete', 'autocomplete'],
    ['cascade', 'cascade-select'],
    ['cascade-select', 'cascade-select'],
    ['address-display', 'address-display'],
    ['ThaiAddressDisplay', 'address-display'],
    ['thai-address-display', 'address-display'],
  ])('resolves %s to %s', (alias, expected) => {
    expect(resolveRegistryItem(alias)?.name).toBe(expected)
  })

  it('exposes the five supported registry items', () => {
    expect(registryItems.map((item) => item.name)).toEqual([
      'autocomplete',
      'cascade-select',
      'address-display',
      'utils',
      'use-thai-address-index',
    ])
  })

  it('address-display depends on thaizip only and pulls in just utils', () => {
    const item = resolveRegistryItem('address-display')
    expect(item?.dependencies).toEqual(['thaizip'])
    expect(item?.registryDependencies).toEqual(['utils'])
  })

  it('returns the .tsx template filename for a component', () => {
    const item = resolveRegistryItem('autocomplete')
    expect(item).toBeDefined()
    expect(item!.files[0].target.file).toBe('thai-address-autocomplete.tsx')
  })

  it('autocomplete depends on thaizip + Base UI and pulls in utils + use-thai-address-index', () => {
    const item = resolveRegistryItem('autocomplete')
    expect(item?.dependencies).toEqual(['thaizip', '@base-ui/react'])
    expect(item?.registryDependencies).toEqual(['utils', 'use-thai-address-index'])
  })

  it('provides utils and use-thai-address-index shared items', () => {
    const utils = resolveRegistryItem('utils')
    expect(utils?.type).toBe('lib')
    expect(utils?.dependencies).toEqual(['clsx', 'tailwind-merge'])
    expect(utils?.files).toEqual([{ source: 'react/ts/lib/utils.ts', target: { dir: 'libDir', file: 'utils.ts' } }])
    const hook = resolveRegistryItem('use-thai-address-index')
    expect(hook?.type).toBe('hook')
    expect(hook?.dependencies).toEqual(['thaizip'])
    expect(hook?.files).toEqual([{ source: 'react/ts/hooks/use-thai-address-index.ts', target: { dir: 'hooksDir', file: 'use-thai-address-index.ts' } }])
  })
})

const fake = (name: string, registryDependencies: string[] = []): RegistryItem => ({
  name, description: name, aliases: [name], type: 'component',
  files: [{ source: `react/ts/${name}.tsx`, target: { dir: 'componentDir', file: `${name}.tsx` } }],
  dependencies: [], registryDependencies,
})

describe('resolveWithDependencies', () => {
  it('returns dependencies before dependents, deduplicated', () => {
    const registry = [fake('utils'), fake('hook', ['utils']), fake('a', ['hook', 'utils']), fake('b', ['hook'])]
    const result = resolveWithDependencies([registry[2], registry[3]], registry)
    expect(result.map((i) => i.name)).toEqual(['utils', 'hook', 'a', 'b'])
  })

  it('throws on unknown registry dependency', () => {
    const registry = [fake('a', ['missing'])]
    expect(() => resolveWithDependencies([registry[0]], registry)).toThrow('Unknown registry item: missing')
  })

  it('throws on cycles', () => {
    const registry = [fake('a', ['b']), fake('b', ['a'])]
    expect(() => resolveWithDependencies([registry[0]], registry)).toThrow(/cycle/i)
  })
})

describe('registryItems data', () => {
  it('contains autocomplete and cascade-select with template files', () => {
    expect(resolveRegistryItem('autocomplete')?.files[0].source).toBe('react/ts/thai-address-autocomplete.tsx')
    expect(resolveRegistryItem('cascade-select')?.files[0].target).toEqual({ dir: 'componentDir', file: 'thai-address-cascade-select.tsx' })
    for (const item of registryItems) {
      expect(() => resolveWithDependencies([item])).not.toThrow()
    }
  })

  it('cascade-select points at the Base UI template and shares the lib/hook items', () => {
    const item = resolveRegistryItem('cascade')
    expect(item?.files).toEqual([
      {
        source: 'react/ts/thai-address-cascade-select.tsx',
        target: { dir: 'componentDir', file: 'thai-address-cascade-select.tsx' },
      },
    ])
    expect(item?.dependencies).toEqual(['thaizip', '@base-ui/react'])
    expect(item?.registryDependencies).toEqual(['utils', 'use-thai-address-index'])
    expect(item?.exportName).toBe('ThaiAddressCascadeSelect')
  })
})

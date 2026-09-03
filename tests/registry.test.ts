import { describe, expect, it } from 'vitest'
import { registryItems, resolveRegistryItem, resolveWithDependencies, selectVariant, type RegistryItem } from '../src/registry.js'

describe('registry', () => {
  it.each([
    ['autocomplete', 'autocomplete'],
    ['ThaiAddressAutocomplete', 'autocomplete'],
    ['cascade', 'cascade-select'],
    ['cascade-select', 'cascade-select'],
    ['address-form', 'address-form'],
    ['thai-address-form', 'address-form'],
    ['ThaiAddressForm', 'address-form'],
    ['address-display', 'address-display'],
    ['ThaiAddressDisplay', 'address-display'],
    ['thai-address-display', 'address-display'],
    ['address-form-field', 'address-form-field'],
    ['thai-address-form-field', 'address-form-field'],
    ['ThaiAddressFormField', 'address-form-field'],
  ])('resolves %s to %s', (alias, expected) => {
    expect(resolveRegistryItem(alias)?.name).toBe(expected)
  })

  it('exposes the seven supported registry items', () => {
    expect(registryItems.map((item) => item.name)).toEqual([
      'autocomplete',
      'cascade-select',
      'address-form',
      'address-display',
      'address-form-field',
      'utils',
      'use-thai-address-index',
    ])
  })

  it('address-form-field depends on thaizip + Base UI + react-hook-form and pulls in utils, use-thai-address-index, and cascade-select', () => {
    const item = resolveRegistryItem('address-form-field')
    expect(item?.dependencies).toContain('react-hook-form')
    expect(item?.registryDependencies).toEqual(['utils', 'use-thai-address-index', 'cascade-select'])
  })

  it('address-form depends on thaizip + Base UI and pulls in utils, use-thai-address-index, and cascade-select', () => {
    const item = resolveRegistryItem('address-form')
    expect(item?.dependencies).toEqual(['thaizip', '@base-ui/react'])
    expect(item?.registryDependencies).toEqual(['utils', 'use-thai-address-index', 'cascade-select'])
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

  it('address-form resolves against the real registry and pulls in cascade-select transitively', () => {
    const item = resolveRegistryItem('address-form')!
    expect(() => resolveWithDependencies([item])).not.toThrow()
    const resolved = resolveWithDependencies([item])
    expect(resolved.map((i) => i.name)).toContain('cascade-select')
  })
})

describe('selectVariant', () => {
  it('returns the vanilla files/dependencies with an empty shadcnPrimitives list for style: vanilla', () => {
    const item = resolveRegistryItem('autocomplete')!
    expect(selectVariant(item, 'vanilla')).toEqual({
      files: item.files,
      dependencies: item.dependencies,
      shadcnPrimitives: [],
    })
  })

  it('returns the shadcn override for autocomplete under style: shadcn', () => {
    const item = resolveRegistryItem('autocomplete')!
    const variant = selectVariant(item, 'shadcn')
    expect(variant.files).toEqual([
      { source: 'react/ts/shadcn/thai-address-autocomplete.tsx', target: { dir: 'componentDir', file: 'thai-address-autocomplete.tsx' } },
    ])
    expect(variant.dependencies).toEqual(['thaizip'])
    expect(variant.shadcnPrimitives).toEqual(['popover', 'command', 'button'])
  })

  it('returns the shadcn override for cascade-select under style: shadcn', () => {
    const variant = selectVariant(resolveRegistryItem('cascade-select')!, 'shadcn')
    expect(variant.dependencies).toEqual(['thaizip'])
    expect(variant.shadcnPrimitives).toEqual(['select', 'label', 'button', 'input'])
  })

  it('returns the shadcn override for address-form and address-form-field under style: shadcn', () => {
    expect(selectVariant(resolveRegistryItem('address-form')!, 'shadcn').shadcnPrimitives).toEqual(['input', 'label'])
    expect(selectVariant(resolveRegistryItem('address-form-field')!, 'shadcn').shadcnPrimitives).toEqual([])
    expect(selectVariant(resolveRegistryItem('address-form-field')!, 'shadcn').dependencies).toContain('react-hook-form')
  })

  it('falls back to the vanilla file for address-display under style: shadcn (no shadcn block)', () => {
    const item = resolveRegistryItem('address-display')!
    expect(selectVariant(item, 'shadcn')).toEqual({
      files: item.files,
      dependencies: item.dependencies,
      shadcnPrimitives: [],
    })
  })

  it('utils and use-thai-address-index have no shadcn block and resolve identically under both styles', () => {
    for (const name of ['utils', 'use-thai-address-index']) {
      const item = resolveRegistryItem(name)!
      expect(selectVariant(item, 'shadcn')).toEqual(selectVariant(item, 'vanilla'))
    }
  })
})

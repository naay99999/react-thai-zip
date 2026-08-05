export type RegistryItemType = 'component' | 'lib' | 'hook'
export type TargetDirKey = 'componentDir' | 'libDir' | 'hooksDir'
export type TemplateFile = {
  source: string // path under templates/, e.g. 'react/ts/thai-address-autocomplete.tsx'
  target: { dir: TargetDirKey; file: string } // resolved as path.join(cwd, config[dir], file)
}
export type RegistryItem = {
  name: string
  description: string
  aliases: string[]
  type: RegistryItemType
  files: TemplateFile[]
  dependencies: string[] // npm packages
  registryDependencies: string[] // names of other RegistryItems
  // Named export the primary template file provides, for the post-scaffold "import it from"
  // hint. Only needed when it can't be derived from the (possibly kebab-case) filename —
  // defaults to a basename derivation in add.ts when omitted.
  exportName?: string
}

export const registryItems: RegistryItem[] = [
  {
    name: 'autocomplete',
    description: 'Free-text Thai address autocomplete (Base UI Combobox)',
    aliases: ['autocomplete', 'thai-address-autocomplete', 'ThaiAddressAutocomplete'],
    type: 'component',
    files: [{ source: 'react/ts/thai-address-autocomplete.tsx', target: { dir: 'componentDir', file: 'thai-address-autocomplete.tsx' } }],
    dependencies: ['thaizip', '@base-ui/react'],
    registryDependencies: ['utils', 'use-thai-address-index'],
    exportName: 'ThaiAddressAutocomplete',
  },
  {
    name: 'cascade-select',
    description: 'Province > district > sub-district select flow (Base UI Select)',
    aliases: ['cascade', 'cascade-select', 'thai-address-cascade-select', 'ThaiAddressCascadeSelect'],
    type: 'component',
    files: [{ source: 'react/ts/thai-address-cascade-select.tsx', target: { dir: 'componentDir', file: 'thai-address-cascade-select.tsx' } }],
    dependencies: ['thaizip', '@base-ui/react'],
    registryDependencies: ['utils', 'use-thai-address-index'],
    exportName: 'ThaiAddressCascadeSelect',
  },
  {
    name: 'utils',
    description: 'cn() class-name helper (clsx + tailwind-merge)',
    aliases: ['utils', 'cn'],
    type: 'lib',
    files: [{ source: 'react/ts/lib/utils.ts', target: { dir: 'libDir', file: 'utils.ts' } }],
    dependencies: ['clsx', 'tailwind-merge'],
    registryDependencies: [],
  },
  {
    name: 'use-thai-address-index',
    description: 'Shared hook that loads the bundled thaizip address index',
    aliases: ['use-thai-address-index', 'index-hook'],
    type: 'hook',
    files: [{ source: 'react/ts/hooks/use-thai-address-index.ts', target: { dir: 'hooksDir', file: 'use-thai-address-index.ts' } }],
    dependencies: ['thaizip'],
    registryDependencies: [],
  },
]

export function resolveRegistryItem(target: string, registry: RegistryItem[] = registryItems): RegistryItem | undefined {
  const normalized = target.toLowerCase()
  return registry.find((item) => item.aliases.some((alias) => alias.toLowerCase() === normalized))
}

export function resolveWithDependencies(selected: RegistryItem[], registry: RegistryItem[] = registryItems): RegistryItem[] {
  const ordered: RegistryItem[] = []
  const visiting = new Set<string>()
  const visited = new Set<string>()

  function visit(item: RegistryItem): void {
    if (visited.has(item.name)) return
    if (visiting.has(item.name)) throw new Error(`Registry dependency cycle involving: ${item.name}`)
    visiting.add(item.name)
    for (const depName of item.registryDependencies) {
      const dep = registry.find((candidate) => candidate.name === depName)
      if (!dep) throw new Error(`Unknown registry item: ${depName}`)
      visit(dep)
    }
    visiting.delete(item.name)
    visited.add(item.name)
    ordered.push(item)
  }

  for (const item of selected) visit(item)
  return ordered
}

export type RegistryItemType = 'component' | 'lib' | 'hook'
export type TargetDirKey = 'componentDir' | 'libDir' | 'hooksDir'
export type TemplateFile = {
  source: string // path under templates/, e.g. 'react/ts/ThaiAddressAutocomplete.tsx'
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
}

export const registryItems: RegistryItem[] = [
  {
    name: 'autocomplete',
    description: 'Free-text Thai address autocomplete',
    aliases: ['autocomplete', 'thai-address-autocomplete', 'ThaiAddressAutocomplete'],
    type: 'component',
    files: [{ source: 'react/ts/ThaiAddressAutocomplete.tsx', target: { dir: 'componentDir', file: 'ThaiAddressAutocomplete.tsx' } }],
    dependencies: ['thaizip'],
    registryDependencies: [],
  },
  {
    name: 'cascade-select',
    description: 'Province > district > sub-district select flow',
    aliases: ['cascade', 'cascade-select', 'thai-address-cascade-select', 'ThaiAddressCascadeSelect'],
    type: 'component',
    files: [{ source: 'react/ts/ThaiAddressCascadeSelect.tsx', target: { dir: 'componentDir', file: 'ThaiAddressCascadeSelect.tsx' } }],
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

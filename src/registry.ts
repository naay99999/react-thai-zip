export type RegistryComponent = {
  name: string
  description: string
  aliases: string[]
  dependencies: string[]
}

export const registryComponents = [
  {
    name: 'ThaiAddressAutocomplete',
    description: 'Free-text Thai address autocomplete',
    aliases: ['autocomplete', 'ThaiAddressAutocomplete'],
    dependencies: ['thaizip'],
  },
  {
    name: 'ThaiAddressCascadeSelect',
    description: 'Province to district to sub-district select flow',
    aliases: ['cascade', 'cascade-select', 'ThaiAddressCascadeSelect'],
    dependencies: ['thaizip'],
  },
] satisfies RegistryComponent[]

export function resolveRegistryComponent(target: string): RegistryComponent | undefined {
  const normalized = target.toLowerCase()
  return registryComponents.find((component) =>
    component.aliases.some((alias) => alias.toLowerCase() === normalized),
  )
}

export function getComponentTemplateFile(component: RegistryComponent): string {
  return `${component.name}.tsx`
}

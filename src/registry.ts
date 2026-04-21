export type TemplateLanguage = 'ts' | 'js'

export type RegistryComponent = {
  name: string
  description: string
  aliases: string[]
  requiresTailwind: boolean
  dependencies: string[]
}

export const registryComponents = [
  {
    name: 'ThaiAddressAutocomplete',
    description: 'Free-text Thai address autocomplete',
    aliases: ['autocomplete', 'ThaiAddressAutocomplete'],
    requiresTailwind: true,
    dependencies: ['thaizip'],
  },
  {
    name: 'ThaiAddressPostalCodeForm',
    description: 'Postal-code-first Thai address form',
    aliases: ['postal-code-form', 'postal-form', 'ThaiAddressForm', 'ThaiAddressPostalForm', 'ThaiAddressPostalCodeForm'],
    requiresTailwind: true,
    dependencies: ['thaizip'],
  },
  {
    name: 'ThaiAddressDisplayFields',
    description: 'Read-only address display fields',
    aliases: ['display-fields', 'fields', 'ThaiAddressSearch', 'ThaiAddressDisplayFields'],
    requiresTailwind: true,
    dependencies: ['thaizip'],
  },
  {
    name: 'ThaiAddressCascadeSelect',
    description: 'Province to district to sub-district select flow',
    aliases: ['cascade-select', 'ThaiAddressCascadeSelect'],
    requiresTailwind: true,
    dependencies: ['thaizip'],
  },
] satisfies RegistryComponent[]

export function resolveRegistryComponent(target: string): RegistryComponent | undefined {
  const normalized = target.toLowerCase()
  return registryComponents.find((component) =>
    component.aliases.some((alias) => alias.toLowerCase() === normalized),
  )
}

export function getRegistryComponent(name: string): RegistryComponent {
  const component = resolveRegistryComponent(name)
  if (!component) {
    throw new Error(`Unknown component: ${name}`)
  }
  return component
}

export function getComponentTemplateFile(component: RegistryComponent, language: TemplateLanguage): string {
  return `${component.name}.${language === 'ts' ? 'tsx' : 'jsx'}`
}

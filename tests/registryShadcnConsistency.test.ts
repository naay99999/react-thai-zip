// Regression test for a prior cross-task bug: cascade-select's registry
// shadcnPrimitives list was missing two entries ('button', 'input') the
// actual shadcn template needed, and was only caught by manual review, twice.
// This reads each shadcn-style template's real @/components/ui/* imports off
// disk and asserts the registry's shadcnPrimitives (unioned with whatever
// every transitively-reachable registryDependencies item's own shadcn
// variant needs — walked with the same resolveWithDependencies the real
// scaffold path uses) is a superset. If a template starts importing a new
// shadcn primitive without the registry entry being updated to match, this
// test fails immediately instead of waiting on manual review.
import { readFileSync } from 'node:fs'
import { getTemplatePath } from '../src/utils/copyTemplate.js'
import { registryItems, resolveWithDependencies, selectVariant, type RegistryItem } from '../src/registry.js'

function importedShadcnPrimitives(templateSource: string): Set<string> {
  const content = readFileSync(getTemplatePath(templateSource), 'utf8')
  const found = new Set<string>()
  for (const match of content.matchAll(/@\/components\/ui\/(\w+)/g)) {
    found.add(match[1])
  }
  return found
}

// Every shadcnPrimitives entry declared for `item` itself, plus every one
// declared by the shadcn variant of anything `item` transitively pulls in via
// registryDependencies (e.g. address-form -> cascade-select). Walks the same
// graph resolveWithDependencies uses for a real `add`, rather than hardcoding
// the one level of cascade-select transitivity known today, so this keeps
// working if a future item's registryDependencies graph gets deeper.
function reachableShadcnPrimitives(item: RegistryItem): Set<string> {
  const resolved = resolveWithDependencies([item], registryItems)
  const primitives = new Set<string>()
  for (const dep of resolved) {
    for (const primitive of selectVariant(dep, 'shadcn').shadcnPrimitives) {
      primitives.add(primitive)
    }
  }
  return primitives
}

describe('registry <-> shadcn template consistency', () => {
  const itemsWithShadcnVariant = registryItems.filter((item) => item.shadcn)

  it('sanity check: at least the four known shadcn-backed items are covered', () => {
    expect(itemsWithShadcnVariant.map((item) => item.name).sort()).toEqual(
      ['address-form', 'address-form-field', 'autocomplete', 'cascade-select'].sort(),
    )
  })

  it.each(itemsWithShadcnVariant.map((item) => [item.name, item] as const))(
    "%s's shadcn template only imports @/components/ui/* primitives declared (directly or via a registryDependency) in the registry",
    (_name, item) => {
      const templateSource = item.shadcn!.files[0].source
      const imported = importedShadcnPrimitives(templateSource)
      const declared = reachableShadcnPrimitives(item)

      const undeclared = [...imported].filter((primitive) => !declared.has(primitive))
      expect(undeclared, `template imports ${[...imported].join(', ')} but registry only declares ${[...declared].join(', ')}`).toEqual([])
    },
  )

  it('would have caught the cascade-select gap: reverting shadcnPrimitives to the pre-fix list fails the check', () => {
    const cascadeSelect = registryItems.find((item) => item.name === 'cascade-select')!
    // Pre-fix state: only ['select', 'label'] — missing 'button' and 'input'
    // that thai-address-cascade-select.tsx's shadcn template actually imports.
    const brokenItem: RegistryItem = {
      ...cascadeSelect,
      shadcn: { ...cascadeSelect.shadcn!, shadcnPrimitives: ['select', 'label'] },
    }
    const brokenRegistry = registryItems.map((item) => (item.name === 'cascade-select' ? brokenItem : item))

    const imported = importedShadcnPrimitives(brokenItem.shadcn!.files[0].source)
    const resolved = resolveWithDependencies([brokenItem], brokenRegistry)
    const declared = new Set(resolved.flatMap((dep) => selectVariant(dep, 'shadcn').shadcnPrimitives))

    const undeclared = [...imported].filter((primitive) => !declared.has(primitive))
    expect(undeclared).toEqual(expect.arrayContaining(['button', 'input']))
  })
})

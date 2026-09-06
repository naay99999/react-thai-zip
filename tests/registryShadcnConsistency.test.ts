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
//
// Runs per component library (SHADCN_BASES), skipping any (item, base) pair
// with no declared variant yet — so this suite grows coverage automatically
// as the radix/aria template trees land, without failing in between.
import { readFileSync } from 'node:fs'
import { getTemplatePath } from '../src/utils/copyTemplate.js'
import { registryItems, resolveWithDependencies, selectVariant, type RegistryItem } from '../src/registry.js'
import { SHADCN_BASES, type ShadcnBase } from '../src/utils/config.js'

function importedShadcnPrimitives(templateSource: string): Set<string> {
  const content = readFileSync(getTemplatePath(templateSource), 'utf8')
  const found = new Set<string>()
  for (const match of content.matchAll(/@\/components\/ui\/(\w+)/g)) {
    found.add(match[1])
  }
  return found
}

// Every shadcnPrimitives entry declared for `item` itself under `base`, plus
// every one declared by the shadcn/`base` variant of anything `item`
// transitively pulls in via registryDependencies (e.g. address-form ->
// cascade-select). Walks the same graph resolveWithDependencies uses for a
// real `add`, rather than hardcoding the one level of cascade-select
// transitivity known today, so this keeps working if a future item's
// registryDependencies graph gets deeper.
function reachableShadcnPrimitives(item: RegistryItem, base: ShadcnBase): Set<string> {
  const resolved = resolveWithDependencies([item], registryItems)
  const primitives = new Set<string>()
  for (const dep of resolved) {
    for (const primitive of selectVariant(dep, 'shadcn', base).shadcnPrimitives) {
      primitives.add(primitive)
    }
  }
  return primitives
}

// Authoring-only packages that the radix/aria/base shadcn fixtures import to
// typecheck/test against (see CLAUDE.md's "Build details" section) but that
// must never be installed into a user's target project — a shadcn-style
// component calls into the *target project's own already-installed*
// shadcn/ui primitives, never our vendored engine. This is the whole point
// of the shadcn variant existing at all: the vanilla variant legitimately
// depends on '@base-ui/react' (that's what its templates import), so this
// list is checked only against each item's `shadcn` variants, never its
// top-level (vanilla) `dependencies`.
const AUTHORING_ONLY_PACKAGES = ['@base-ui/react', 'radix-ui', 'react-aria-components', 'cn']

describe('registry <-> shadcn template consistency', () => {
  it('sanity check: the four known shadcn-backed items each define all three base variants', () => {
    const knownShadcnItems = ['address-form', 'address-form-field', 'autocomplete', 'cascade-select']
    const itemsWithAllBases = registryItems.filter((item) => SHADCN_BASES.every((base) => item.shadcn?.[base]))
    expect(itemsWithAllBases.map((item) => item.name).sort()).toEqual(knownShadcnItems.sort())
  })

  it('no shadcn variant of any registry item depends on an authoring-only primitive package', () => {
    const offenders: string[] = []
    for (const item of registryItems) {
      if (!item.shadcn) continue
      for (const base of SHADCN_BASES) {
        const variant = item.shadcn[base]
        if (!variant) continue
        for (const pkg of AUTHORING_ONLY_PACKAGES) {
          if (variant.dependencies.includes(pkg)) {
            offenders.push(`${item.name}/shadcn/${base} depends on '${pkg}'`)
          }
        }
      }
    }
    expect(offenders).toEqual([])
  })

  const pairs = registryItems.flatMap((item) =>
    SHADCN_BASES.filter((base) => item.shadcn?.[base]).map((base) => [item.name, base, item] as const),
  )

  it.each(pairs)(
    "%s's shadcn/%s template only imports @/components/ui/* primitives declared (directly or via a registryDependency) in the registry",
    (_name, base, item) => {
      const templateSource = selectVariant(item, 'shadcn', base).files[0].source
      const imported = importedShadcnPrimitives(templateSource)
      const declared = reachableShadcnPrimitives(item, base)

      const undeclared = [...imported].filter((primitive) => !declared.has(primitive))
      expect(undeclared, `template imports ${[...imported].join(', ')} but registry only declares ${[...declared].join(', ')}`).toEqual([])
    },
  )

  it('would have caught the cascade-select gap: reverting shadcnPrimitives to the pre-fix list fails the check', () => {
    const cascadeSelect = registryItems.find((item) => item.name === 'cascade-select')!
    // Pre-fix state: only ['select', 'label'] — missing 'button' and 'input'
    // that thai-address-cascade-select.tsx's shadcn/base template actually imports.
    const brokenItem: RegistryItem = {
      ...cascadeSelect,
      shadcn: {
        ...cascadeSelect.shadcn,
        base: { ...cascadeSelect.shadcn!.base!, shadcnPrimitives: ['select', 'label'] },
      },
    }
    const brokenRegistry = registryItems.map((item) => (item.name === 'cascade-select' ? brokenItem : item))

    const imported = importedShadcnPrimitives(brokenItem.shadcn!.base!.files[0].source)
    const resolved = resolveWithDependencies([brokenItem], brokenRegistry)
    const declared = new Set(resolved.flatMap((dep) => selectVariant(dep, 'shadcn', 'base').shadcnPrimitives))

    const undeclared = [...imported].filter((primitive) => !declared.has(primitive))
    expect(undeclared).toEqual(expect.arrayContaining(['button', 'input']))
  })
})

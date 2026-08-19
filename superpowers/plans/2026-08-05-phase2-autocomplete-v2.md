# Phase 2: Autocomplete v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the `utils` + `use-thai-address-index` shared registry items and a new `ThaiAddressAutocomplete` built on Base UI Combobox with shadcn tokens, full form integration, and runtime locale support.

**Architecture:** Two new shared registry items (lib + hook) feed a rewritten component template. Templates author cross-file imports as `@/lib/...` / `@/hooks/...`; `add` rewrites them to computed relative paths at scaffold time. The repo gains devDependencies + a dedicated tsconfig so the new template is typechecked at authoring time.

**Tech Stack:** Base UI (`@base-ui-components/react`), clsx + tailwind-merge, thaizip >= 0.7.0.

**Spec:** `docs/superpowers/specs/2026-08-05-react-thai-zip-redesign-design.md` (incl. the dark-mode amendment)

## Global Constraints

- Branch: `feat/autocomplete-v2` off `main`. Conventional Commits, one commit per task minimum.
- Runtime deps of the CLI itself: unchanged (`execa`, `prompts`). New packages appear only as (a) registry `dependencies` installed into user projects, and (b) repo **devDependencies** for template typechecking.
- Template styling uses ONLY token utilities (`bg-background`, `text-foreground`, `border-input`, `bg-popover`, `text-muted-foreground`, `ring-ring`, `bg-accent`, `text-accent-foreground`, `text-destructive`, `rounded-md`, etc.) + `cn()`. No slate/gray literals, no `dark:` variants (tokens handle dark mode).
- All of `npm test`, `npm run typecheck`, `npm run typecheck:templates` (new), `npm run build` green at the end of every task that touches their scope.
- Tasks 1 and 2 are parallel-safe (disjoint files). Task 3 depends on both. Task 4 depends on Task 3.

---

### Task 1: `utils` + `use-thai-address-index` registry items

*(Parallel-safe with Task 2 — touches registry.ts, new small templates, registry tests. Does NOT touch package.json, tsconfig, or the autocomplete template.)*

**Files:**
- Create: `templates/react/ts/lib/utils.ts`, `templates/react/ts/hooks/use-thai-address-index.ts`
- Modify: `src/registry.ts` (add 2 items; leave the existing autocomplete/cascade-select entries untouched)
- Test: `tests/registry.test.ts` (data assertions), `tests/add.test.ts` (real-registry lib/hook scaffold)

**Interfaces:**
- Consumes: Phase 1 `RegistryItem` model.
- Produces: registry items named exactly `utils` (type `lib`) and `use-thai-address-index` (type `hook`); template exports `cn(...inputs: ClassValue[]): string` and `useThaiAddressIndex(): { index: TrigramIndex | null; error: Error | null; isLoading: boolean; retry: () => void }`.

**Step 1 — failing tests** (append to `tests/registry.test.ts`):

```ts
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
```

And to `tests/add.test.ts` (uses the REAL registry, not the synthetic one):

```ts
it('scaffolds the real utils and use-thai-address-index items into libDir/hooksDir', async () => {
  const cwd = await tempProjectWithConfigV2()
  await addComponents({ cwd, targets: ['utils', 'use-thai-address-index'], yes: true })
  const utils = await readFile(path.join(cwd, 'lib/utils.ts'), 'utf8')
  expect(utils).toContain('twMerge(clsx(inputs))')
  const hook = await readFile(path.join(cwd, 'hooks/use-thai-address-index.ts'), 'utf8')
  expect(hook).toContain('loadDefaultIndex')
  expect(hook).toContain("'use client'")
})
```

**Step 2 — template content.** `templates/react/ts/lib/utils.ts` exactly:

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
```

`templates/react/ts/hooks/use-thai-address-index.ts` exactly:

```ts
'use client'

import { useCallback, useEffect, useState } from 'react'
import { loadDefaultIndex } from 'thaizip/data'
import type { TrigramIndex } from 'thaizip'

/**
 * Loads the bundled Thai address index once and exposes loading/error state.
 * `retry()` re-attempts a failed load.
 */
export function useThaiAddressIndex(): {
  index: TrigramIndex | null
  error: Error | null
  isLoading: boolean
  retry: () => void
} {
  const [index, setIndex] = useState<TrigramIndex | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [generation, setGeneration] = useState(0)

  useEffect(() => {
    let active = true
    setError(null)

    loadDefaultIndex()
      .then((loaded) => {
        if (active) setIndex(loaded)
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause : new Error(String(cause)))
      })

    return () => {
      active = false
    }
  }, [generation])

  const retry = useCallback(() => {
    setGeneration((current) => current + 1)
  }, [])

  return { index, error, isLoading: index === null && error === null, retry }
}
```

**Step 3 — registry entries** (append to `registryItems`):

```ts
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
```

**Steps 4-5:** `npm test && npm run typecheck` green → commit `feat: add utils and use-thai-address-index shared registry items`.

---

### Task 2: New ThaiAddressAutocomplete template on Base UI Combobox + template typecheck rig

*(Parallel-safe with Task 1 — creates a NEW template file (kebab-case name, does not delete the old one), adds repo devDependencies and the templates tsconfig. Does NOT touch src/registry.ts or src/commands.)*

**Files:**
- Create: `templates/react/ts/thai-address-autocomplete.tsx`, `tsconfig.templates.json`
- Modify: `package.json` (devDependencies + `typecheck:templates` script)

**Interfaces:**
- Consumes (authored, resolved at scaffold time by Task 3's rewriter): `import { cn } from '@/lib/utils'`, `import { useThaiAddressIndex } from '@/hooks/use-thai-address-index'`; `useThaiAddressAutocomplete` from `thaizip/react`; `Combobox` from `@base-ui-components/react/combobox`.
- Produces: `export function ThaiAddressAutocomplete(props: ThaiAddressAutocompleteProps)` (with forwarded ref via `ref` prop — React 19 style is fine, else `forwardRef`), `export type ThaiAddressAutocompleteProps`.

**Step 1 — devDependencies + rig.** Install (dev): `@base-ui-components/react`, `react`, `react-dom`, `@types/react`, `@types/react-dom`, `thaizip`, `clsx`, `tailwind-merge`. Add `tsconfig.templates.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": [],
    "paths": {
      "@/lib/utils": ["./templates/react/ts/lib/utils.ts"],
      "@/hooks/use-thai-address-index": ["./templates/react/ts/hooks/use-thai-address-index.ts"]
    }
  },
  "include": ["templates/react/ts/**/*.ts", "templates/react/ts/**/*.tsx"]
}
```

package.json script: `"typecheck:templates": "tsc -p tsconfig.templates.json"`. (The legacy `ThaiAddressCascadeSelect.tsx` is included by the glob; if it fails under strict, exclude it explicitly with a comment — it is replaced in Phase 3.)

**Note:** the `paths` mapping means this task typechecks against Task 1's template files. In the parallel wave, stub the two files ONLY if they are absent in your worktree (identical content to Task 1's Step 2 — the merge is content-identical so git dedupes); if present, use them as-is.

**Step 2 — component contract.** The template implements EXACTLY this API (from the spec):

```ts
type AddressLocale = 'th' | 'en'
type Texts = {
  placeholder: string
  clearAriaLabel: string
  loadingText: string
  errorText: string
  retryLabel: string
  emptyText: string
}
export type ThaiAddressAutocompleteProps = {
  value?: ResolvedThaiAddress | null          // controlled
  defaultValue?: ResolvedThaiAddress | null   // uncontrolled seed (fills input via initialQuery)
  onValueChange?: (address: ResolvedThaiAddress | null) => void
  name?: string                               // renders 4 hidden inputs: `${name}-subdistrict|-district|-province|-zipcode`
  locale?: AddressLocale                      // default 'th'; drives suggestion labels AND default texts
  texts?: Partial<Texts>
  limit?: number; debounce?: number; threshold?: number
  disabled?: boolean; required?: boolean
  onBlur?: React.FocusEventHandler<HTMLInputElement>
  onError?: (error: Error) => void
  'aria-invalid'?: React.AriaAttributes['aria-invalid']
  className?: string                          // root
  inputClassName?: string; popupClassName?: string; itemClassName?: string
  ref?: React.Ref<HTMLInputElement>           // forwarded to the text input
}
```

Behavior requirements:
1. Index loading via `useThaiAddressIndex()`. Loading → input disabled + `aria-busy="true"` + `loadingText` placeholder. Error → container with `role="alert"` showing `errorText`, a retry button (`retryLabel`) calling `retry()`, and `onError(error)` fired via `useEffect` when the error appears.
2. Search via `useThaiAddressAutocomplete({ index, limit, debounce, threshold, locale, initialQuery })` where `initialQuery` derives from `defaultValue`/`value` label (Thai or EN name per `locale`, e.g. `` `${subdistrict} > ${district} > ${province} ${zipCode}` `` using the resolved fields matching thaizip's own label shape).
3. Base UI `Combobox.Root` drives the popup/list/ARIA. Wire: `items={suggestions}`, input value = hook `query` (`setQuery` on input change), selection → `selectSuggestion(item)` → non-null result → echo label with `setQuerySilent(label per locale)` + `onValueChange(resolved)`. Escape/blur close comes from Base UI — selection state must NOT be cleared by a mere close.
4. Controlled mode: when `value` prop changes (including → null), sync the input text via `setQuerySilent` (empty string for null). Uncontrolled: internal state seeded by `defaultValue`.
5. Clearing: when the user empties the input, fire `onValueChange(null)`. A clear button (visible when text is non-empty, `clearAriaLabel`) resets input + selection.
6. Hidden inputs (only when `name` given): 4 `<input type="hidden">` with the resolved `subdistrict`/`district`/`province`/`zipCode` (empty string when no selection); `required` goes on the visible input.
7. Default texts per locale, exactly:
   - th: `placeholder: 'พิมพ์ตำบล อำเภอ จังหวัด หรือรหัสไปรษณีย์'`, `clearAriaLabel: 'ล้างที่อยู่'`, `loadingText: 'กำลังโหลดข้อมูล...'`, `errorText: 'โหลดข้อมูลที่อยู่ไม่สำเร็จ'`, `retryLabel: 'ลองใหม่'`, `emptyText: 'ไม่พบที่อยู่'`
   - en: `placeholder: 'Type sub-district, district, province or postal code'`, `clearAriaLabel: 'Clear address'`, `loadingText: 'Loading address data...'`, `errorText: 'Failed to load address data'`, `retryLabel: 'Retry'`, `emptyText: 'No address found'`
8. Styling: tokens + `cn()` per Global Constraints; suggestion rows show `labelTh`/`labelEn` per `locale` with the zip visually distinct (`text-muted-foreground`).
9. Study the INSTALLED `@base-ui-components/react` Combobox types under node_modules before writing JSX — do not guess prop names. Use the parts the installed version provides (Root/Input/Portal/Positioner/Popup/List/Item/Empty or equivalents).

**Step 3 — verify:** `npm run typecheck:templates` green (this is the gate for this task; the template has no unit tests in this phase). `npm test && npm run typecheck` stay green (untouched, but confirm). Commit `feat: new ThaiAddressAutocomplete template on Base UI Combobox + template typecheck rig`.

---

### Task 3: Wire autocomplete registry entry + scaffold-time import rewriting

*(Sequential — depends on Tasks 1 & 2 both merged.)*

**Files:**
- Modify: `src/registry.ts` (autocomplete entry), `src/commands/add.ts` (import rewrite), `tsconfig.templates.json` (drop stubs note if any)
- Delete: `templates/react/ts/ThaiAddressAutocomplete.tsx` (old template)
- Test: `tests/add.test.ts`, `tests/registry.test.ts`

**Interfaces:**
- Consumes: Task 1 items, Task 2 template.
- Produces: autocomplete `RegistryItem` v2; `rewriteTemplateImports(content, destinationDir, config, cwd): string` exported from `src/commands/add.ts` (or a new `src/utils/rewriteImports.ts` — implementer's choice, but exported and unit-tested).

**Step 1 — registry entry** becomes:

```ts
{
  name: 'autocomplete',
  description: 'Free-text Thai address autocomplete (Base UI Combobox)',
  aliases: ['autocomplete', 'thai-address-autocomplete', 'ThaiAddressAutocomplete'],
  type: 'component',
  files: [{ source: 'react/ts/thai-address-autocomplete.tsx', target: { dir: 'componentDir', file: 'thai-address-autocomplete.tsx' } }],
  dependencies: ['thaizip', '@base-ui-components/react'],
  registryDependencies: ['utils', 'use-thai-address-index'],
},
```

**Step 2 — import rewriting.** After copying a `component`-type file, rewrite its content:
- `'@/lib/<rest>'` → relative POSIX path from the destination file's directory to `<cwd>/<config.libDir>/<rest>` (no extension), prefixed `./` when not starting with `.`
- `'@/hooks/<rest>'` → same against `config.hooksDir`

```ts
export function rewriteTemplateImports(content: string, destinationDir: string, config: ThaiZipConfig, cwd: string): string {
  const map: Array<[RegExp, string]> = [
    [/(['"])@\/lib\/([^'"]+)\1/g, config.libDir],
    [/(['"])@\/hooks\/([^'"]+)\1/g, config.hooksDir],
  ]
  let result = content
  for (const [pattern, dir] of map) {
    result = result.replace(pattern, (_match, quote: string, rest: string) => {
      let relative = path.relative(destinationDir, path.join(cwd, dir, rest)).split(path.sep).join('/')
      if (!relative.startsWith('.')) relative = `./${relative}`
      return `${quote}${relative}${quote}`
    })
  }
  return result
}
```

Apply only to `type === 'component'` items, only when the copy actually wrote the file.

**Step 3 — failing tests first**, then implement:

```ts
it('rewrites @/lib and @/hooks imports to relative paths on scaffold', async () => {
  const cwd = await tempProjectWithConfigV2()          // componentDir 'app/components', libDir 'lib', hooksDir 'hooks'
  await addComponents({ cwd, targets: ['autocomplete'], yes: true })
  const component = await readFile(path.join(cwd, 'app/components/thai-address-autocomplete.tsx'), 'utf8')
  expect(component).toContain("from '../../lib/utils'")
  expect(component).toContain("from '../../hooks/use-thai-address-index'")
  expect(component).not.toContain("'@/")
  expect(await pathExists(path.join(cwd, 'lib/utils.ts'))).toBe(true)
  expect(await pathExists(path.join(cwd, 'hooks/use-thai-address-index.ts'))).toBe(true)
})

it('unit: rewriteTemplateImports handles same-directory targets', () => {
  const config = { ...baseV2Config, componentDir: 'src', libDir: 'src', hooksDir: 'src' }
  const out = rewriteTemplateImports("import { cn } from '@/lib/utils'", '/p/src', config as ThaiZipConfig, '/p')
  expect(out).toBe("import { cn } from './utils'")
})
```

Also update any existing tests referencing the old `ThaiAddressAutocomplete.tsx` template file/alias expectations (aliases stay, file name changes), and the registry data test for autocomplete's new deps/registryDependencies.

**Step 4:** delete the old template; `npm test && npm run typecheck && npm run typecheck:templates` green → commit `feat!: autocomplete v2 — Base UI registry entry, transitive scaffold, import rewriting`.

---

### Task 4: Docs + full verification sweep

**Files:** `CLAUDE.md`, `README.md`; full suite run.

- Update both docs: new component file name + props surface (brief), `utils`/`use-thai-address-index` items, `@/` import rewriting behavior, `typecheck:templates` command, Base UI dependency. README quick-start shows `npx react-thaizip add autocomplete` scaffolding 3 files + deps.
- Run: `npm test && npm run typecheck && npm run typecheck:templates && npm run build && node dist/cli.js --help` — help must list only component-type items.
- Commit `docs: update CLAUDE.md and README for autocomplete v2`.

---

## Execution notes

- Wave 1: Tasks 1 and 2 in PARALLEL (isolated worktrees, disjoint files). Merge both into `feat/autocomplete-v2` (only benign overlap: none expected; Task 2's optional stubs are content-identical to Task 1's files).
- Wave 2: Task 3, then Task 4, sequential on the phase branch.
- Per-task review after each task; final whole-branch review before merge to main.

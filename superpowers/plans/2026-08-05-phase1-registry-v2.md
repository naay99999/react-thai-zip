# Phase 1: Registry v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the react-thaizip CLI around a shadcn-style multi-file registry with config v2, Tailwind v3/v4 detection, design-token writing, and non-interactive flags — and delete all legacy surface (JS templates, 2 old components, `--lang`, Tailwind auto-install, dead code).

**Architecture:** The registry becomes a list of `RegistryItem`s (component/lib/hook) with `files[]` and transitive `registryDependencies`. `add` resolves items deps-first, copies multiple files per item, skips existing shared files, and gates on thaizip >= 0.7.0. `init` requires Tailwind as a prerequisite, detects v3/v4, and appends shadcn design tokens to the user's global CSS.

**Tech Stack:** Node 18+ ESM, TypeScript, tsup, vitest, prompts, execa. No new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-08-05-react-thai-zip-redesign-design.md`

## Global Constraints

- Branch: `feat/registry-v2` off `main`. One commit per completed task, Conventional Commits.
- `MINIMUM_THAIZIP_VERSION = '0.7.0'`, `CORE_PACKAGE_VERSION = '>=0.7.0'`.
- TypeScript-only templates; `templates/react/js/` must not exist at the end of this phase.
- No zod, no commander, no chalk — hand-rolled parsing/validation, consistent with `src/utils/semver.ts`.
- New user-facing flags: `--yes`, `--overwrite`, `--help`, `--version`. `--lang` is removed.
- All tests green (`npm test`) and `npm run typecheck` clean at the end of every task.
- Run all commands from `/Users/naay/workspace/naay/thai-zip-lib/react-thai-zip`.

**Phase-1 scope note:** the two registry items keep pointing at the *existing* `ThaiAddressAutocomplete.tsx` / `ThaiAddressCascadeSelect.tsx` templates. New Base-UI templates plus the `utils` / `use-thai-address-index` registry items arrive in Phases 2–3. The registry/`add` machinery built here must already support `lib`/`hook` types and `registryDependencies` (tested with a synthetic registry) so Phases 2–3 only add data + template files.

**Tailwind v3 refinement (spec deviation, approved direction):** on v3, `bg-background` etc. require a `theme.extend.colors` mapping in `tailwind.config.*`. We do NOT auto-edit the user's Tailwind config. `init` on v3 writes the CSS variables and prints the config snippet for the user to paste. v4 is fully automatic via `@theme inline`.

---

### Task 1: Strip legacy surface

**Files:**
- Delete: `templates/react/js/` (whole directory), `templates/react/ts/ThaiAddressPostalCodeForm.tsx`, `templates/react/ts/ThaiAddressDisplayFields.tsx`, `src/locales.ts`, `src/utils/installTailwind.ts`
- Modify: `src/cli.ts`, `src/commands/add.ts`, `src/commands/init.ts`, `src/registry.ts`, `src/utils/copyTemplate.ts`, `src/utils/detectProjectStructure.ts`
- Test: `tests/add.test.ts`, `tests/cli.test.ts`, `tests/registry.test.ts`, `tests/detectProjectStructure.test.ts`

**Interfaces:**
- Consumes: current codebase on a fresh `feat/registry-v2` branch.
- Produces: registry with only `ThaiAddressAutocomplete` + `ThaiAddressCascadeSelect`; `getComponentTemplateFile(component)` (no language param); `copyTemplate`'s `getTemplatePath(fileName)` resolving under `templates/react/ts/`; `detectProjectStructure` returning `{ directory: string }` only; `addComponents(options: { cwd?, targets? })` with no `lang`; `initProject` no longer installing Tailwind (temporary warning log only — replaced in Task 7).

- [ ] **Step 1: Create the branch**

```bash
git checkout -b feat/registry-v2
```

- [ ] **Step 2: Delete legacy files**

```bash
git rm -r templates/react/js
git rm templates/react/ts/ThaiAddressPostalCodeForm.tsx templates/react/ts/ThaiAddressDisplayFields.tsx
git rm src/locales.ts src/utils/installTailwind.ts
```

- [ ] **Step 3: Update `src/registry.ts`**

Remove the `ThaiAddressPostalCodeForm` and `ThaiAddressDisplayFields` entries, the `TemplateLanguage` type, the `getRegistryComponent` function, and the `requiresTailwind` field (from the type and both remaining entries). Change:

```ts
export function getComponentTemplateFile(component: RegistryComponent): string {
  return `${component.name}.tsx`
}
```

- [ ] **Step 4: Update `src/utils/copyTemplate.ts`**

`getTemplatePath(fileName: string)` — drop the language parameter; the candidate paths become `../templates/react/ts/<fileName>` and `../../templates/react/ts/<fileName>`.

- [ ] **Step 5: Update `src/utils/detectProjectStructure.ts`**

Remove the `structure` field from the returned object and its type; keep `directory`.

- [ ] **Step 6: Update `src/commands/add.ts`**

Remove the `lang` option, the `localizeDefaultTexts` import and call, and the `const language = config.typescript ? 'ts' : 'js'` line (call `getComponentTemplateFile(component)` and `getTemplatePath(fileName)` directly).

- [ ] **Step 7: Update `src/commands/init.ts`**

Remove the `installTailwind` import. Replace the Tailwind-install prompt block with a temporary warning (Task 7 replaces this entirely):

```ts
const hasTailwind = await detectTailwind(cwd)
if (!hasTailwind) {
  console.warn('\nTailwind CSS was not detected. Components require Tailwind; install it before adding components.')
}
```

Remove the `useTypeScript` prompt: `const useTypeScript = true` (keep writing `typescript: true` to the config for now; Task 3 reworks the config shape).

- [ ] **Step 8: Update `src/cli.ts`**

Delete `extractLangOption`; the `add` route becomes:

```ts
if (command === 'add') {
  await addComponents({ targets })
  return
}
```

- [ ] **Step 9: Update tests**

- `tests/add.test.ts`: delete tests for `--lang`/localization, PostalCodeForm, DisplayFields, and JS-variant scaffolding; update remaining assertions that reference `js/` paths or removed aliases.
- `tests/cli.test.ts`: delete the `--lang` extraction test.
- `tests/registry.test.ts`: delete `getRegistryComponent` tests; update the expected component list to the 2 remaining entries.
- `tests/detectProjectStructure.test.ts`: drop `structure` assertions, keep `directory` ones.

- [ ] **Step 10: Verify**

Run: `npm test && npm run typecheck`
Expected: PASS (all remaining tests green, no type errors)

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat!: remove JS templates, PostalCodeForm/DisplayFields, --lang, Tailwind auto-install, and dead code"
```

---

### Task 2: Registry v2 data model + transitive resolver

**Files:**
- Modify: `src/registry.ts`
- Test: `tests/registry.test.ts`

**Interfaces:**
- Consumes: Task 1's cleaned registry.
- Produces (used by Task 8's `add` and by Phases 2–3):

```ts
export type RegistryItemType = 'component' | 'lib' | 'hook'
export type TargetDirKey = 'componentDir' | 'libDir' | 'hooksDir'
export type TemplateFile = {
  source: string                              // path under templates/, e.g. 'react/ts/ThaiAddressAutocomplete.tsx'
  target: { dir: TargetDirKey; file: string } // resolved as path.join(cwd, config[dir], file)
}
export type RegistryItem = {
  name: string
  description: string
  aliases: string[]
  type: RegistryItemType
  files: TemplateFile[]
  dependencies: string[]          // npm packages
  registryDependencies: string[]  // names of other RegistryItems
}
export const registryItems: RegistryItem[]
export function resolveRegistryItem(target: string, registry?: RegistryItem[]): RegistryItem | undefined
export function resolveWithDependencies(selected: RegistryItem[], registry?: RegistryItem[]): RegistryItem[]
```

`resolveWithDependencies` returns a deduplicated list in dependency-first order (an item's registryDependencies appear before it); unknown names throw `Error('Unknown registry item: <name>')`; cycles throw `Error('Registry dependency cycle involving: <name>')`.

- [ ] **Step 1: Write failing tests**

Append to `tests/registry.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { registryItems, resolveRegistryItem, resolveWithDependencies, type RegistryItem } from '../src/registry.js'

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
    expect(resolveRegistryItem('autocomplete')?.files[0].source).toBe('react/ts/ThaiAddressAutocomplete.tsx')
    expect(resolveRegistryItem('cascade-select')?.files[0].target).toEqual({ dir: 'componentDir', file: 'ThaiAddressCascadeSelect.tsx' })
    for (const item of registryItems) {
      expect(() => resolveWithDependencies([item])).not.toThrow()
    }
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/registry.test.ts`
Expected: FAIL (`resolveWithDependencies` not exported)

- [ ] **Step 3: Implement in `src/registry.ts`**

Replace `RegistryComponent`/`registryComponents`/`getComponentTemplateFile` with the types above and:

```ts
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
```

Update `src/commands/add.ts` call sites minimally so the build stays green: import `registryItems`, `resolveRegistryItem`, `RegistryItem`; in the scaffold loop use `item.files[0]` (`const fileName = item.files[0].target.file`) and `item.name` in logs. (Task 8 rewrites `add` properly; this keeps it compiling and tests passing.)

- [ ] **Step 4: Verify**

Run: `npm test && npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: multi-file registry model with transitive dependency resolution"
```

---

### Task 3: Config v2 — type, validator, migration

**Files:**
- Modify: `src/utils/config.ts`, `src/commands/init.ts` (only the `writeConfig` call shape)
- Test: `tests/config.test.ts`

**Interfaces:**
- Consumes: `detectTailwind` v1 (boolean) still — migration that needs Tailwind info receives it as a parameter, so this task has no dependency on Task 4.
- Produces:

```ts
export type TailwindInfo = { version: 3 | 4; css: string }   // css = repo-relative path to global CSS ('' if unknown)
export type ThaiZipConfig = {
  typescript: true
  componentDir: string
  libDir: string
  hooksDir: string
  packageManager: PackageManager
  tailwind: TailwindInfo
  registryVersion: string
}
export function validateConfig(value: unknown): { ok: true; config: ThaiZipConfig } | { ok: false; errors: string[] }
export function migrateLegacyConfig(raw: Record<string, unknown>, tailwind: TailwindInfo): ThaiZipConfig | null
export async function readConfig(cwd?: string, options?: { tailwind?: TailwindInfo }): Promise<ThaiZipConfig>
```

- `validateConfig` collects human-readable errors like `'componentDir: expected non-empty string'`, `'typescript: JavaScript templates are no longer supported; re-run init'`.
- `migrateLegacyConfig` maps a v1 config (has `componentDir` + `packageManager`, missing `libDir`/`hooksDir`/`tailwind`) to v2 with `libDir: 'lib'`, `hooksDir: 'hooks'`, the provided `tailwind`, dropping `corePackage`. Returns `null` when the raw object is not a recognizable v1 config.
- `readConfig` validates; on a legacy shape it migrates (using `options.tailwind`, defaulting to `{ version: 4, css: '' }`), **writes the migrated config back**, and logs `Migrated thaizip.config.json to v2.`. On invalid config it throws `Error` listing the errors and advising `npx react-thaizip init`.
- Constants change here: `CORE_PACKAGE_VERSION = '>=0.7.0'`, `MINIMUM_THAIZIP_VERSION = '0.7.0'` (update the explanatory comments: the floor is now the 0.7.0 cascade/locale API, not the 0.6.0 react subpath).

- [ ] **Step 1: Write failing tests**

Append to `tests/config.test.ts` (follow the file's existing temp-dir helper pattern):

```ts
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { migrateLegacyConfig, readConfig, validateConfig } from '../src/utils/config.js'

const v2 = {
  typescript: true, componentDir: 'app/components', libDir: 'lib', hooksDir: 'hooks',
  packageManager: 'npm', tailwind: { version: 4, css: 'app/globals.css' }, registryVersion: '1.0.0',
}

describe('validateConfig', () => {
  it('accepts a valid v2 config', () => {
    expect(validateConfig(v2)).toEqual({ ok: true, config: v2 })
  })
  it('names each bad field', () => {
    const result = validateConfig({ ...v2, componentDir: '', tailwind: { version: 2, css: 'x.css' } })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.join('\n')).toContain('componentDir')
      expect(result.errors.join('\n')).toContain('tailwind.version')
    }
  })
  it('rejects typescript: false with a migration hint', () => {
    const result = validateConfig({ ...v2, typescript: false })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join('\n')).toMatch(/no longer supported/)
  })
})

describe('migrateLegacyConfig', () => {
  it('fills v2 fields from a v1 config', () => {
    const legacy = {
      typescript: true, componentDir: 'src/components', packageManager: 'pnpm',
      corePackage: { name: 'thaizip', version: '>=0.6.0' }, registryVersion: '0.2.1',
    }
    expect(migrateLegacyConfig(legacy, { version: 3, css: 'src/index.css' })).toEqual({
      typescript: true, componentDir: 'src/components', libDir: 'lib', hooksDir: 'hooks',
      packageManager: 'pnpm', tailwind: { version: 3, css: 'src/index.css' }, registryVersion: '0.2.1',
    })
  })
  it('returns null for unrecognizable input', () => {
    expect(migrateLegacyConfig({ foo: 1 }, { version: 4, css: '' })).toBeNull()
  })
})

describe('readConfig migration', () => {
  it('migrates a legacy config file in place', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'thaizip-config-'))
    await writeFile(path.join(cwd, 'thaizip.config.json'), JSON.stringify({
      typescript: true, componentDir: 'components', packageManager: 'npm',
      corePackage: { name: 'thaizip', version: '>=0.6.0' }, registryVersion: '0.2.1',
    }))
    const config = await readConfig(cwd, { tailwind: { version: 4, css: 'app/globals.css' } })
    expect(config.libDir).toBe('lib')
    const onDisk = JSON.parse(await readFile(path.join(cwd, 'thaizip.config.json'), 'utf8'))
    expect(onDisk.hooksDir).toBe('hooks')
    expect(onDisk.corePackage).toBeUndefined()
  })
  it('throws a helpful error for an invalid config', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'thaizip-config-'))
    await writeFile(path.join(cwd, 'thaizip.config.json'), JSON.stringify({ componentDir: 42 }))
    await expect(readConfig(cwd)).rejects.toThrow(/react-thaizip init/)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/config.test.ts`
Expected: FAIL (`validateConfig` not exported)

- [ ] **Step 3: Implement in `src/utils/config.ts`**

Hand-written validator (~40 lines): check each field with `typeof`; `packageManager` against `['npm','yarn','pnpm','bun']`; `tailwind` must be an object with `version` 3 or 4 (error key `tailwind.version`) and string `css`; `typescript` must be exactly `true` (error message contains "JavaScript templates are no longer supported; re-run init"). `migrateLegacyConfig` recognizes v1 by `typeof raw.componentDir === 'string' && typeof raw.packageManager === 'string' && !('libDir' in raw)`. `readConfig` flow: parse JSON → `validateConfig` → ok? return; else `migrateLegacyConfig` → non-null? `writeConfig` + log + return; else throw `Error('Invalid thaizip.config.json:\n  - ' + errors.join('\n  - ') + '\nRe-run `npx react-thaizip init` to regenerate it.')`.

Update `init.ts`'s `writeConfig` call to the v2 shape (temporary values: `libDir: 'lib'`, `hooksDir: 'hooks'`, `tailwind: { version: 4, css: '' }` — Task 7 supplies real detection) and fix `tests/init.test.ts` expectations accordingly. Remove the now-unused `CORE_PACKAGE_VERSION` import there if `corePackage` is gone from the config payload — but keep the constant exported from `config.ts` for `init`'s thaizip install (Task 7 uses `thaizip@'>=0.7.0'`).

- [ ] **Step 4: Verify**

Run: `npm test && npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat!: config v2 with libDir/hooksDir/tailwind, validation, and legacy migration"
```

---

### Task 4: Tailwind v3/v4 detection

**Files:**
- Modify: `src/utils/detectTailwind.ts`, callers (`src/commands/init.ts` temporary line from Task 1)
- Test: `tests/detectTailwind.test.ts`

**Interfaces:**
- Consumes: `pathExists` (`src/utils/fs.ts`), `getPackageDependencyRange` (`src/utils/packageJson.ts`), `extractVersionAnchor` (`src/utils/semver.ts`).
- Produces:

```ts
export type TailwindDetection = { version: 3 | 4; cssPath: string | null } | null
export async function detectTailwind(cwd?: string): Promise<TailwindDetection>
export const globalCssCandidates: string[]  // exported for reuse in Task 5 tests
```

Detection rules, in order:
1. Scan `globalCssCandidates = ['app/globals.css', 'src/app/globals.css', 'styles/globals.css', 'src/styles/globals.css', 'src/index.css', 'src/App.css', 'app/global.css']`. If any existing file contains `@import "tailwindcss"` or `@import 'tailwindcss'` → `{ version: 4, cssPath: <that file> }`.
2. Else if `tailwindcss` appears in package.json deps with a version anchor >= 4 → `{ version: 4, cssPath: null }`.
3. Else if a `tailwind.config.{ts,js,cjs,mjs}` file exists → `{ version: 3, cssPath: first candidate file that exists and contains '@tailwind', else null }`.
4. Else → `null`.

- [ ] **Step 1: Write failing tests**

Rewrite `tests/detectTailwind.test.ts`:

```ts
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { detectTailwind } from '../src/utils/detectTailwind.js'

async function tempProject(): Promise<string> {
  return mkdtemp(path.join(tmpdir(), 'thaizip-tw-'))
}

describe('detectTailwind', () => {
  it('detects v4 from @import "tailwindcss" in a known global css', async () => {
    const cwd = await tempProject()
    await mkdir(path.join(cwd, 'app'), { recursive: true })
    await writeFile(path.join(cwd, 'app/globals.css'), '@import "tailwindcss";\n')
    expect(await detectTailwind(cwd)).toEqual({ version: 4, cssPath: 'app/globals.css' })
  })

  it('detects v4 from the package.json dependency range when no css matches', async () => {
    const cwd = await tempProject()
    await writeFile(path.join(cwd, 'package.json'), JSON.stringify({ dependencies: { tailwindcss: '^4.1.0' } }))
    expect(await detectTailwind(cwd)).toEqual({ version: 4, cssPath: null })
  })

  it('detects v3 from a config file and finds the @tailwind css', async () => {
    const cwd = await tempProject()
    await writeFile(path.join(cwd, 'tailwind.config.js'), 'module.exports = {}\n')
    await mkdir(path.join(cwd, 'src'), { recursive: true })
    await writeFile(path.join(cwd, 'src/index.css'), '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n')
    expect(await detectTailwind(cwd)).toEqual({ version: 3, cssPath: 'src/index.css' })
  })

  it('returns null when Tailwind is absent', async () => {
    const cwd = await tempProject()
    expect(await detectTailwind(cwd)).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/detectTailwind.test.ts`
Expected: FAIL (return-shape mismatch: current implementation returns boolean)

- [ ] **Step 3: Implement**

Rewrite `src/utils/detectTailwind.ts` per the rules above (read candidate files with `readFile(...).catch(() => null)`; use `getPackageDependencyRange('tailwindcss', cwd)` + `extractVersionAnchor` + a major-version check `Number(anchor.split('.')[0]) >= 4`). Update the Task 1 temporary caller in `init.ts` to `const tailwind = await detectTailwind(cwd); if (!tailwind) { console.warn(...) }`.

- [ ] **Step 4: Verify**

Run: `npm test && npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: detect Tailwind v3 vs v4 and locate the global CSS file"
```

---

### Task 5: Design-token writer

**Files:**
- Create: `src/utils/tokens.ts`
- Test: `tests/tokens.test.ts`

**Interfaces:**
- Consumes: nothing internal (pure string/file work).
- Produces (used by Task 7's `init`):

```ts
export function hasShadcnTokens(css: string): boolean          // true if both --background: and --input: appear
export function buildTokenBlock(version: 3 | 4): string        // full CSS text below
export function buildV3ConfigSnippet(): string                 // theme.extend snippet printed for v3 users
export async function ensureTokens(cssAbsolutePath: string, version: 3 | 4): Promise<'written' | 'skipped'>
```

`ensureTokens` reads the file, returns `'skipped'` when `hasShadcnTokens` is true, otherwise appends `'\n' + buildTokenBlock(version)` and returns `'written'`.

`buildTokenBlock(4)` returns exactly:

```css
/* react-thaizip design tokens */
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.985 0 0);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --radius: 0.625rem;
}
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --destructive-foreground: oklch(0.985 0 0);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
}
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) - 2px);
  --radius-sm: calc(var(--radius) - 4px);
}
```

`buildTokenBlock(3)` returns the same variable set as HSL channel triples (shadcn neutral palette) in `:root` / `.dark`, no `@theme` block:

```css
/* react-thaizip design tokens */
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 3.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 0 0% 3.9%;
  --primary: 0 0% 9%;
  --primary-foreground: 0 0% 98%;
  --muted: 0 0% 96.1%;
  --muted-foreground: 0 0% 45.1%;
  --accent: 0 0% 96.1%;
  --accent-foreground: 0 0% 9%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --border: 0 0% 89.8%;
  --input: 0 0% 89.8%;
  --ring: 0 0% 3.9%;
  --radius: 0.5rem;
}
.dark {
  --background: 0 0% 3.9%;
  --foreground: 0 0% 98%;
  --popover: 0 0% 3.9%;
  --popover-foreground: 0 0% 98%;
  --primary: 0 0% 98%;
  --primary-foreground: 0 0% 9%;
  --muted: 0 0% 14.9%;
  --muted-foreground: 0 0% 63.9%;
  --accent: 0 0% 14.9%;
  --accent-foreground: 0 0% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 0 0% 98%;
  --border: 0 0% 14.9%;
  --input: 0 0% 14.9%;
  --ring: 0 0% 83.1%;
}
```

`buildV3ConfigSnippet()` returns the `tailwind.config` paste-in text:

```
Add this to tailwind.config.{js,ts} under theme.extend:

colors: {
  background: 'hsl(var(--background))',
  foreground: 'hsl(var(--foreground))',
  popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
  primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
  muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
  accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
  destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
  border: 'hsl(var(--border))',
  input: 'hsl(var(--input))',
  ring: 'hsl(var(--ring))',
},
borderRadius: { lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)', sm: 'calc(var(--radius) - 4px)' },
```

- [ ] **Step 1: Write failing tests** (`tests/tokens.test.ts`)

```ts
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildTokenBlock, ensureTokens, hasShadcnTokens } from '../src/utils/tokens.js'

describe('tokens', () => {
  it('hasShadcnTokens requires both --background and --input', () => {
    expect(hasShadcnTokens(':root { --background: 0 0% 100%; --input: 0 0% 89.8%; }')).toBe(true)
    expect(hasShadcnTokens(':root { --background: 0 0% 100%; }')).toBe(false)
  })

  it('v4 block includes @theme inline mapping; v3 block does not', () => {
    expect(buildTokenBlock(4)).toContain('@theme inline')
    expect(buildTokenBlock(4)).toContain('--color-background: var(--background)')
    expect(buildTokenBlock(3)).not.toContain('@theme')
    expect(buildTokenBlock(3)).toContain('--background: 0 0% 100%;')
  })

  it('ensureTokens appends once and skips when tokens exist', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'thaizip-tokens-'))
    const css = path.join(dir, 'globals.css')
    await writeFile(css, '@import "tailwindcss";\n')
    expect(await ensureTokens(css, 4)).toBe('written')
    expect(await ensureTokens(css, 4)).toBe('skipped')
    const content = await readFile(css, 'utf8')
    expect(content.match(/react-thaizip design tokens/g)).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/tokens.test.ts`
Expected: FAIL (module does not exist)

- [ ] **Step 3: Implement `src/utils/tokens.ts`** with the exact CSS above (template literals), `hasShadcnTokens = (css) => /--background\s*:/.test(css) && /--input\s*:/.test(css)`.

- [ ] **Step 4: Verify**

Run: `npm test && npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: shadcn design-token writer for Tailwind v3 and v4"
```

---

### Task 6: CLI flags, help, version

**Files:**
- Modify: `src/cli.ts`
- Test: `tests/cli.test.ts`

**Interfaces:**
- Consumes: `getRegistryVersion()` from `src/utils/config.ts`; `registryItems` for the help text's component list.
- Produces (used by Tasks 7–8):

```ts
export type CliFlags = { yes: boolean; overwrite: boolean; help: boolean; version: boolean }
export function parseCliArgs(argv: string[]): { command: string | undefined; targets: string[]; flags: CliFlags }
```

Behavior: flags may appear anywhere; unknown `--*` flags produce `console.error('Unknown option: <flag>')` + exit code 1; `--help`/`-h` prints usage (commands, flags, and the component list from `registryItems` with descriptions) and returns; `--version`/`-v` prints the version from `getRegistryVersion()`. `main` passes `{ yes, overwrite }` into `addComponents` / `initProject`.

- [ ] **Step 1: Write failing tests**

Append to `tests/cli.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { main, parseCliArgs } from '../src/cli.js'

describe('parseCliArgs', () => {
  it('extracts flags from anywhere in argv', () => {
    expect(parseCliArgs(['add', 'autocomplete', '--yes', 'cascade-select', '--overwrite'])).toEqual({
      command: 'add',
      targets: ['autocomplete', 'cascade-select'],
      flags: { yes: true, overwrite: true, help: false, version: false },
    })
  })
})

describe('main flag handling', () => {
  it('--help prints usage and exits 0', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    await main(['--help'])
    expect(log.mock.calls.flat().join('\n')).toContain('react-thaizip add')
    expect(process.exitCode ?? 0).toBe(0)
    log.mockRestore()
  })

  it('--version prints a semver', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    await main(['--version'])
    expect(log.mock.calls.flat().join('')).toMatch(/\d+\.\d+\.\d+/)
    log.mockRestore()
  })

  it('rejects unknown flags', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    await main(['add', '--frobnicate'])
    expect(process.exitCode).toBe(1)
    process.exitCode = 0
    error.mockRestore()
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/cli.test.ts`
Expected: FAIL (`parseCliArgs` not exported)

- [ ] **Step 3: Implement in `src/cli.ts`**

```ts
const FLAG_MAP: Record<string, keyof CliFlags> = {
  '--yes': 'yes', '-y': 'yes',
  '--overwrite': 'overwrite',
  '--help': 'help', '-h': 'help',
  '--version': 'version', '-v': 'version',
}

export function parseCliArgs(argv: string[]): { command: string | undefined; targets: string[]; flags: CliFlags } {
  const flags: CliFlags = { yes: false, overwrite: false, help: false, version: false }
  const positionals: string[] = []
  for (const arg of argv) {
    const flag = FLAG_MAP[arg]
    if (flag) { flags[flag] = true; continue }
    if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`)
    positionals.push(arg)
  }
  const [command, ...targets] = positionals
  return { command, targets, flags }
}
```

`main`: wrap `parseCliArgs` in try/catch (print message, exit 1). Handle `flags.version` then `flags.help` before command routing; `printHelp()` lists usage, flags, and each `registryItems` entry as `  <name>  <description>`. Route `add` → `addComponents({ targets, yes: flags.yes, overwrite: flags.overwrite })`, `init` → `initProject({ yes: flags.yes })`. Until Tasks 7–8 land, pass only the options the current signatures accept (extend `AddComponentsOptions`/`InitProjectOptions` with the optional booleans now — they are consumed in Tasks 7–8).

- [ ] **Step 4: Verify**

Run: `npm test && npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add --yes/--overwrite/--help/--version flags to the CLI"
```

---

### Task 7: init v2

**Files:**
- Modify: `src/commands/init.ts`
- Test: `tests/init.test.ts`

**Interfaces:**
- Consumes: `detectTailwind` (Task 4), `ensureTokens`/`buildV3ConfigSnippet`/`hasShadcnTokens` (Task 5), config v2 `writeConfig` (Task 3), `CliFlags.yes` via `InitProjectOptions`.
- Produces: `initProject(options: { cwd?: string; yes?: boolean }): Promise<void>` writing a v2 config; exit code 1 without a config when Tailwind is absent.

Flow (replaces the current body):
1. Detect PM, project structure.
2. `componentDir` prompt (initial = detected). With `yes: true`, skip the prompt and take the detected value. `libDir = 'lib'`, `hooksDir = 'hooks'` (no prompts).
3. `detectTailwind`. `null` → print `Tailwind CSS is required. Install it for your framework (https://tailwindcss.com/docs/installation), then re-run npx react-thaizip init.` and exit code 1 — **no config written, no token write, no installs**.
4. Tokens: if `cssPath` is non-null → `ensureTokens(path.join(cwd, cssPath), version)`; log written/skipped. If `cssPath` is null → log that no global CSS was found and print `buildTokenBlock(version)` location guidance (`Add the design tokens manually — see README`). If `version === 3` → additionally print `buildV3ConfigSnippet()`.
5. thaizip: if missing → prompt (auto-accept with `yes`) → `installPackage(['thaizip@>=0.7.0'], ...)` — pass the range explicitly so init installs a compatible version.
6. Existing config → overwrite prompt (default false; `yes` accepts the default, i.e. keeps the file and logs `Skipped writing thaizip.config.json.`).
7. `writeConfig` v2: `{ typescript: true, componentDir, libDir: 'lib', hooksDir: 'hooks', packageManager: pm, tailwind: { version, css: cssPath ?? '' }, registryVersion }`.

- [ ] **Step 1: Write failing tests**

Rework `tests/init.test.ts` (keep its existing prompts-mocking approach; add):

```ts
it('exits without writing config when Tailwind is absent', async () => {
  const cwd = await tempProject()                       // no tailwind markers
  await initProject({ cwd, yes: true })
  expect(process.exitCode).toBe(1)
  process.exitCode = 0
  expect(await pathExists(path.join(cwd, 'thaizip.config.json'))).toBe(false)
})

it('writes a v2 config and appends tokens on a v4 project with --yes', async () => {
  const cwd = await tempProject()
  await mkdir(path.join(cwd, 'app'), { recursive: true })
  await writeFile(path.join(cwd, 'app/globals.css'), '@import "tailwindcss";\n')
  await writeFile(path.join(cwd, 'package.json'), JSON.stringify({ dependencies: { thaizip: '^0.7.0' } }))
  await initProject({ cwd, yes: true })
  const config = JSON.parse(await readFile(path.join(cwd, 'thaizip.config.json'), 'utf8'))
  expect(config.tailwind).toEqual({ version: 4, css: 'app/globals.css' })
  expect(config.libDir).toBe('lib')
  expect(await readFile(path.join(cwd, 'app/globals.css'), 'utf8')).toContain('react-thaizip design tokens')
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run tests/init.test.ts` → FAIL
- [ ] **Step 3: Implement the flow above** (helper `async function confirm(message, initial, yes)` returning `yes ? initial : prompt(...)` — place it in `src/utils/prompt.ts` and reuse in Task 8).
- [ ] **Step 4: Verify** — `npm test && npm run typecheck` → PASS
- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat!: init v2 — Tailwind prerequisite, token writing, v2 config, --yes"
```

---

### Task 8: add v2

**Files:**
- Modify: `src/commands/add.ts`, `src/utils/copyTemplate.ts` (accept full `source` paths)
- Test: `tests/add.test.ts`

**Interfaces:**
- Consumes: `resolveRegistryItem`/`resolveWithDependencies`/`registryItems` (Task 2), `readConfig` v2 (Task 3), `detectTailwind` (Task 4, for migration's `tailwind` param), `confirm` helper (Task 7), version-gate helpers (existing).
- Produces: `addComponents(options: { cwd?: string; targets?: string[]; yes?: boolean; overwrite?: boolean; registry?: RegistryItem[] }): Promise<void>`. The optional `registry` parameter (default `registryItems`) exists so tests can exercise lib/hook/registryDependencies behavior with a synthetic registry before Phase 2 ships real ones.

Flow:
1. Config bootstrap prompt unchanged (`confirm` honors `yes` → auto-runs init).
2. Read config with migration support, mapping the detection shape to the config shape:

```ts
const detected = await detectTailwind(cwd)
const config = await readConfig(cwd, detected ? { tailwind: { version: detected.version, css: detected.cssPath ?? '' } } : undefined)
```
3. Resolve targets → items (`resolveRegistryItem`, throw `Unknown component: X` listing valid names); no targets → multiselect over `registry.filter((i) => i.type === 'component')`; then `resolveWithDependencies(selected, registry)`.
4. npm deps = union over resolved items' `dependencies`; missing-dep install prompt (auto-accept with `yes`) unchanged otherwise.
5. Version gate: only when a resolved item's `dependencies` includes `'thaizip'`; message updated to `thaizip >=0.7.0 is required (cascade/enumeration API and bilingual labels added in 0.7.0); found <v>.`
6. File copy, deps-first order. Per file: destination exists?
   - item.type `'lib'`/`'hook'` → always skip existing, log `Skipped <file> (already exists).`
   - item.type `'component'` → `overwrite` flag ? replace : (`yes` ? skip : prompt default no).
7. Per component item, print the import line (unchanged logic, from the first file's destination).

- [ ] **Step 1: Write failing tests**

Add to `tests/add.test.ts` (reuse its existing temp-project + prompts-mock helpers):

```ts
const syntheticRegistry: RegistryItem[] = [
  { name: 'utils', description: 'cn helper', aliases: ['utils'], type: 'lib',
    files: [{ source: 'react/ts/ThaiAddressAutocomplete.tsx', target: { dir: 'libDir', file: 'utils.ts' } }],
    dependencies: [], registryDependencies: [] },
  { name: 'widget', description: 'test widget', aliases: ['widget'], type: 'component',
    files: [{ source: 'react/ts/ThaiAddressAutocomplete.tsx', target: { dir: 'componentDir', file: 'Widget.tsx' } }],
    dependencies: ['thaizip'], registryDependencies: ['utils'] },
]

it('scaffolds registryDependencies before the component, into libDir', async () => {
  const cwd = await tempProjectWithConfigV2()          // thaizip ^0.7.0 declared
  await addComponents({ cwd, targets: ['widget'], yes: true, registry: syntheticRegistry })
  expect(await pathExists(path.join(cwd, 'lib/utils.ts'))).toBe(true)
  expect(await pathExists(path.join(cwd, 'app/components/Widget.tsx'))).toBe(true)
})

it('never overwrites an existing lib file even with --overwrite', async () => {
  const cwd = await tempProjectWithConfigV2()
  await mkdir(path.join(cwd, 'lib'), { recursive: true })
  await writeFile(path.join(cwd, 'lib/utils.ts'), '// mine\n')
  await addComponents({ cwd, targets: ['widget'], yes: true, overwrite: true, registry: syntheticRegistry })
  expect(await readFile(path.join(cwd, 'lib/utils.ts'), 'utf8')).toBe('// mine\n')
})

it('gates on thaizip 0.7.0', async () => {
  const cwd = await tempProjectWithConfigV2({ thaizipRange: '^0.6.2' })
  await addComponents({ cwd, targets: ['autocomplete'], yes: true })
  expect(process.exitCode).toBe(1)
  process.exitCode = 0
})

it('--yes skips the overwrite prompt by skipping existing component files', async () => {
  const cwd = await tempProjectWithConfigV2()
  await addComponents({ cwd, targets: ['autocomplete'], yes: true })
  const first = await readFile(path.join(cwd, 'app/components/ThaiAddressAutocomplete.tsx'), 'utf8')
  await writeFile(path.join(cwd, 'app/components/ThaiAddressAutocomplete.tsx'), '// modified\n')
  await addComponents({ cwd, targets: ['autocomplete'], yes: true })
  expect(await readFile(path.join(cwd, 'app/components/ThaiAddressAutocomplete.tsx'), 'utf8')).toBe('// modified\n')
  void first
})
```

Also update every existing `add.test.ts` case for the v2 config fixture (helper `tempProjectWithConfigV2` writes the Task 3 v2 shape with `componentDir: 'app/components'`, `libDir: 'lib'`, `hooksDir: 'hooks'`, `tailwind: { version: 4, css: 'app/globals.css' }`, plus `package.json` declaring `thaizip` at the given range, default `^0.7.0`).

- [ ] **Step 2: Run to verify failure** — `npx vitest run tests/add.test.ts` → FAIL
- [ ] **Step 3: Implement the flow above.** `copyTemplate`'s `getTemplatePath(source: string)` now takes the registry `source` path (`react/ts/...`) — adjust Task 1's version (candidates `../templates/<source>`, `../../templates/<source>`).
- [ ] **Step 4: Verify** — `npm test && npm run typecheck` → PASS
- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat!: add v2 — multi-file scaffolding, per-item version gate on thaizip 0.7, --yes/--overwrite"
```

---

### Task 9: Final sweep

**Files:**
- Modify: `CLAUDE.md` (this package), `README.md`
- Test: full suite

**Interfaces:**
- Consumes: everything above.
- Produces: a phase-complete branch ready for PR.

- [ ] **Step 1: Update `CLAUDE.md`**: registry lives at `src/registry.ts` with the multi-file `RegistryItem` model; commands/flags (`init [--yes]`, `add [--yes] [--overwrite]`, `--help`, `--version`); TS-only templates; Tailwind is a prerequisite (v3 needs a manual config snippet); `MINIMUM_THAIZIP_VERSION = 0.7.0`; remove mentions of `--lang`, `locales.ts`, `installTailwind.ts`, JS templates, and the 2 removed components.
- [ ] **Step 2: Update `README.md`** usage section to match (component list, flags, prerequisite note).
- [ ] **Step 3: Full verification**

Run: `npm test && npm run typecheck && npm run build && node dist/cli.js --help && node dist/cli.js --version`
Expected: all PASS; help lists `autocomplete` and `cascade-select`; version prints the package version.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs: update CLAUDE.md and README for registry v2"
```

- [ ] **Step 5: Push and open the phase PR**

```bash
git push -u origin feat/registry-v2
gh pr create --title "feat!: registry v2 — multi-file registry, config v2, Tailwind v4, CLI flags" --body "Phase 1 of the v2 redesign (spec: docs/superpowers/specs/2026-08-05-react-thai-zip-redesign-design.md)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01EgpgueAU5s92UFyQtH7rJ9"
```

---

## Phase 2–4 planning

Phases 2 (`feat/autocomplete-v2`), 3 (`feat/cascade-v2`), and 4 (`chore/hardening`) get their own plan documents written when each phase starts, against the actual post-Phase-1 codebase. Their scope is fixed by the spec's phase table.

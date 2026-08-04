# react-thaizip v2 redesign — design spec

Date: 2026-08-05
Status: approved pending user review

**Amendment (Phase 1 final review, 2026-08-05):** the Tailwind v4 token block
(`buildTokenBlock(4)` in `src/utils/tokens.ts`) must include
`@custom-variant dark (&:is(.dark *));` above `:root`. Without it, Tailwind v4's
`dark:` utility defaults to a `prefers-color-scheme` media query and the emitted
`.dark { ... }` class-based block never applies. Fixed in Phase 1; Phase 2/3
components that rely on dark-mode tokens depend on this.

## Goal

Rebuild `react-thaizip` into a shadcn-style scaffold tool: components composed from
**Base UI** headless primitives + **Tailwind with shadcn design tokens**, powered by
`thaizip` >= 0.7.0, installable with a single command and usable in real forms
(react-hook-form, native `<form>`) out of the box.

Out of scope for this redesign: documentation site, remote registries, `diff`/`list`
commands, browser/E2E tests of the scaffolded components.

## Decisions (locked)

| Topic | Decision |
|---|---|
| Headless primitive | Base UI (`@base-ui-components/react`) |
| Template language | TypeScript only — `templates/react/js/` is deleted |
| Styling | shadcn design tokens (CSS variables) + `cn()` (clsx + tailwind-merge) |
| Component set | 2 high-quality components: `ThaiAddressAutocomplete`, `ThaiAddressCascadeSelect` |
| Old components | `ThaiAddressPostalCodeForm`, `ThaiAddressDisplayFields` removed from the registry |
| Localization | Runtime `locale` prop (`'th' \| 'en'`, default `'th'`); the `--lang` flag and `src/locales.ts` regex rewriting are removed |
| Phasing | 4 phases, 1 branch per phase, tasks delegated to sub-agents, commit per task |

## Architecture

### What the user gets

After `npx react-thaizip add autocomplete`:

```
<componentDir>/thai-address-autocomplete.tsx   # Base UI Combobox + tokens
<libDir>/utils.ts                              # cn() = clsx + tailwind-merge
<hooksDir>/use-thai-address-index.ts           # shared index loader hook (loading/error state)
```

npm dependencies installed into the user project: `thaizip`,
`@base-ui-components/react`, `clsx`, `tailwind-merge`.

### Registry (multi-file, shadcn-style)

`src/registry.ts` changes from "1 component = 1 template file" to:

```ts
type RegistryItem = {
  name: string                     // 'autocomplete' | 'cascade-select' | 'utils' | 'use-thai-address-index'
  type: 'component' | 'lib' | 'hook'
  files: TemplateFile[]            // template path -> destination (componentDir/libDir/hooksDir + filename)
  dependencies: string[]           // npm packages
  registryDependencies: string[]   // other registry items, resolved transitively
}
```

`add` resolves `registryDependencies` transitively and **skips files that already
exist** (e.g. a shadcn user's existing `lib/utils.ts` is never overwritten), same
behavior as the shadcn CLI. `--overwrite` forces replacement of component files;
shared `lib`/`hook` files are only ever written when absent.

### Config (`thaizip.config.json` v2)

```json
{
  "typescript": true,
  "componentDir": "app/components",
  "libDir": "lib",
  "hooksDir": "hooks",
  "packageManager": "npm",
  "tailwind": { "version": 4, "css": "app/globals.css" },
  "registryVersion": "<CLI version>"
}
```

- Older configs missing new fields are migrated in place with defaults.
- Validated by a small hand-written validator (~30 lines, no zod — consistent with
  the repo's existing no-dependency stance, cf. `src/utils/semver.ts`). A failed
  validation names the bad field and suggests re-running `init`.
- `typescript` is kept for config compatibility but `init` no longer prompts for it
  (TS-only templates); a `false` value produces a clear error.

### CSS tokens

`init` inspects the user's global CSS:

- If shadcn tokens already exist (`--background`, `--input`, ...) → leave untouched.
- Otherwise append our token block: `:root { ... }` + `.dark { ... }` for Tailwind v3,
  `@theme` syntax for v4.

Templates style exclusively via token utilities (`bg-background`, `border-input`,
`ring-ring`, ...) and `cn()` so consumer `className` overrides genuinely win.

## Component API

### Shared conventions (both components)

- **Value model**: both emit `ResolvedThaiAddress` via `onValueChange(address | null)`.
  Controlled (`value`) and uncontrolled (`defaultValue`) are both supported; external
  reset/set works.
- **Form integration**: `name` prop renders four hidden inputs
  (`{name}-subdistrict`, `{name}-district`, `{name}-province`, `{name}-zipcode`) so a
  native `<form>` submit captures the address. `ref` is forwarded to the primary
  input (react-hook-form `register()`/`Controller` both work). `onBlur`, `disabled`,
  `required`, and `aria-invalid` pass through.
- **Locale**: `locale?: 'th' | 'en'` (default `'th'`) drives suggestion/option labels
  (`labelTh`/`labelEn`, `nameTh`/`nameEn`) and selects the built-in default UI text
  set; `texts?: Partial<Texts>` still overrides individual strings.
- **Tuning**: `limit`, `debounce`, `threshold` exposed as props (hook defaults apply).
- **Loading/error**: from the shared `useThaiAddressIndex` hook. Loading = disabled
  input + `aria-busy`. Error = message with `role="alert"` + retry button + `onError?`
  callback. No component is silently replaced by a bare `<p>`.

### `ThaiAddressAutocomplete` — Base UI Combobox

- Built on `Combobox.Root/Input/Popup/List/Item`; the primitive provides ARIA 1.2
  combobox semantics, blur/outside-click close, Escape-closes-popup (does NOT clear
  the value), Home/End, scroll-into-view, and focus management.
- `defaultValue` seeds the input via the hook's `initialQuery`; selection echoes the
  label via `setQuerySilent` — edit-form flows work.
- Zip-code queries keep working in the same input (core routes all-digit queries).

### `ThaiAddressCascadeSelect` — Base UI Select x3

- Province → district → subdistrict selects plus a read-only zip field.
- Uses core `listProvinces` / `listAmphures` / `listTambons` (no more manual
  `index.records` scans).
- Option labels follow `locale`.
- Selecting a subdistrict resolves to the same `ResolvedThaiAddress` shape as
  Autocomplete. Changing a parent select that invalidates the current value fires
  `onValueChange(null)` (the legacy stray `onClear` firing is gone).

## CLI

### Commands and flags

```
react-thaizip init [--yes]
react-thaizip add [component...] [--yes] [--overwrite]
react-thaizip --help | --version    (+ per-command help)
```

- `--yes`: accept defaults for every prompt (CI/agent friendly).
- `--overwrite`: replace existing component files without prompting.
- `--lang` is removed. Argv parsing stays hand-rolled.

### Tailwind handling

- New `detectTailwind`: v4 via `@import "tailwindcss"` in CSS + `tailwindcss` in
  deps; v3 via config file. Returns `{ version: 3 | 4 | null, cssPath }`.
- Tailwind absent → **no auto-install** (delete `installTailwind.ts`; its
  `tailwindcss init -p` is broken on v4). `init` explains that Tailwind is a
  prerequisite and exits cleanly, shadcn-style.

### Version gate

- `MINIMUM_THAIZIP_VERSION` bumps to `0.7.0` (CascadeSelect needs the cascade API;
  both need `labelTh`/`labelEn`).
- The gate applies per registry item based on its actual dependencies rather than
  unconditionally.

### Deletions

`templates/react/js/` (all), `ThaiAddressPostalCodeForm` + `ThaiAddressDisplayFields`
templates and registry entries, `src/locales.ts`, `src/utils/installTailwind.ts`,
`getRegistryComponent`, `RegistryComponent.requiresTailwind`,
`ProjectDestination.structure`.

## Error handling summary

| Failure | Behavior |
|---|---|
| Invalid/legacy config | Migrate if possible; otherwise name the bad field, suggest `init`, exit 1 |
| Package install fails | Exit 1 with manual install command |
| Destination file exists | Prompt (default no) / `--overwrite` / `--yes` skips |
| Tailwind missing | Explain prerequisite, exit without scaffolding |
| Index load fails (runtime) | Component shows `role="alert"` error + retry, fires `onError` |
| Stale suggestion selected | `selectSuggestion` returns null → ignored, input state unchanged |

## Testing

- **Templates are typechecked in CI**: a dedicated tsconfig covers `templates/`;
  `@types/react`, `@base-ui-components/react`, and `thaizip` become devDependencies
  of this repo for that purpose.
- New unit tests: transitive `registryDependencies` resolution + skip-existing,
  config migration/validation, Tailwind v4 detection, `--yes`/`--overwrite`,
  `--help`/`--version` output.
- Backfilled gaps: install path (mocked execa), no-config bootstrap flow, unknown
  component error.
- Existing util/command tests are kept and adapted.
- No browser/E2E tests of the components in this redesign.

## Phase plan (1 branch per phase)

| Phase | Branch | Content |
|---|---|---|
| 1 | `feat/registry-v2` | Multi-file registry, config v2 + migration + validator, Tailwind v4 detect + token writing, `--yes`/`--overwrite`/`--help`/`--version`, all deletions |
| 2 | `feat/autocomplete-v2` | `utils` + `use-thai-address-index` registry items, new Autocomplete on Base UI Combobox |
| 3 | `feat/cascade-v2` | New CascadeSelect on Base UI Select + core cascade API |
| 4 | `chore/hardening` | Test gap backfill, template typecheck in CI, cleanup |

Each phase is decomposed into tasks executable by sub-agents, with a commit per
completed task. Conventional Commits throughout (`feat!:` where breaking).

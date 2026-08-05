# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

`react-thaizip` is a CLI scaffold tool (`npx react-thaizip init` / `npx react-thaizip add <component>`) that detects a user's React/Next.js project layout, installs `thaizip`, and writes ready-to-use Thai address components into the appropriate directory — similar to shadcn/ui.

## Commands

```bash
npm run build                # compile src/ → dist/ via tsup (ESM, Node 18 target)
npm test                     # run all tests with vitest
npm run typecheck            # tsc --noEmit
npm run typecheck:templates  # typecheck templates/react/ts/**/* standalone against tsconfig.templates.json (@/lib, @/hooks aliases)
```

Run a single test file:
```bash
npx vitest run tests/detectPM.test.ts
```

## Architecture

```
src/cli.ts                      # Entry point — parses argv/flags, routes to commands, prints help/version
src/registry.ts                 # RegistryItem model + resolver (multi-file items, aliases, dependencies, registryDependencies, exportName)
src/commands/
  add.ts                        # "add" command: resolves targets + transitive registryDependencies, version-gates thaizip, writes files, rewrites @/ imports
  init.ts                       # "init" command: detects project layout + Tailwind, writes design tokens, writes config
src/utils/
  config.ts                     # thaizip.config.json (v2) read/write/migrate; CORE_PACKAGE_VERSION, MINIMUM_THAIZIP_VERSION
  detectPM.ts                   # Infers npm/yarn/pnpm/bun from lockfiles (bun.lock, bun.lockb, ...)
  detectProjectStructure.ts     # Decides where to write components (see below)
  detectTailwind.ts             # Detects Tailwind v3 vs v4 and locates the global CSS file
  tokens.ts                     # Design-token block + Tailwind v3 config snippet + CSS token writer
  install.ts                    # Generic package install helper
  copyTemplate.ts               # Copies template files to the destination directory
  rewriteImports.ts             # Rewrites templates' authored `@/lib/*` and `@/hooks/*` imports to relative paths at scaffold time
  fs.ts                         # Thin fs wrapper (pathExists, etc.)
  packageJson.ts                # Reads/checks package.json dependencies and version ranges
  semver.ts                     # Minimal semver comparison used for the thaizip version gate
  prompt.ts                     # Confirm-prompt helper (respects --yes)
templates/react/
  ts/                           # TypeScript component templates (TS-only; no JS templates)
    thai-address-autocomplete.tsx    # Base UI Combobox-based autocomplete (imports `@/lib/utils` + `@/hooks/use-thai-address-index`)
    ThaiAddressCascadeSelect.tsx     # legacy province > district > sub-district select
    lib/utils.ts                     # cn() class-name helper (clsx + tailwind-merge) — shared registry item
    hooks/use-thai-address-index.ts  # loads the bundled thaizip index — shared registry item
tsconfig.templates.json         # standalone tsconfig (path-mapped @/lib, @/hooks) used by `typecheck:templates`
tests/                          # Vitest unit tests, one file per util + command
  thai-address-autocomplete.test.tsx  # RTL/jsdom test for the Base UI autocomplete
  rewriteImports.test.ts              # unit tests for @/lib, @/hooks import rewriting
```

## Component registry

Components are resolved by name or alias in `src/registry.ts` against the `RegistryItem` model (multi-file: each item lists one or more `TemplateFile`s with their own target directory, plus `dependencies` and `registryDependencies`). Four registry items exist; only the two `component`-type ones are directly selectable (via `add [target]` or the interactive multiselect / `--help` listing) — the `lib` and `hook` items are pulled in transitively:

- `autocomplete` / `thai-address-autocomplete` / `ThaiAddressAutocomplete` — `component`; `registryDependencies: ['utils', 'use-thai-address-index']`
- `cascade` / `cascade-select` / `thai-address-cascade-select` / `ThaiAddressCascadeSelect` — `component`; no registry dependencies
- `utils` / `cn` — `lib`; writes `<libDir>/utils.ts` (`cn()` via clsx + tailwind-merge)
- `use-thai-address-index` / `index-hook` — `hook`; writes `<hooksDir>/use-thai-address-index.ts` (loads the bundled thaizip index)

`resolveWithDependencies` topologically expands `registryDependencies` (cycle-checked) before any files are written, so `add autocomplete` also writes the `utils` and `use-thai-address-index` files without either needing to be named explicitly. `lib`/`hook` files are never overwritten once present — only `component` files respect `--overwrite`/the overwrite prompt. `RegistryItem.exportName` supplies the named export for the post-scaffold "import it from" hint when it can't be derived from the (possibly kebab-case) filename.

Multiple targets can be passed at once: `npx react-thaizip add autocomplete cascade-select`

## Template import rewriting

Templates that need `lib`/`hook` helpers are authored against a fixed `@/lib/*` / `@/hooks/*` alias (the shadcn/ui convention) so `tsconfig.templates.json` can typecheck them standalone via `npm run typecheck:templates`. Real user projects rarely have that alias wired up, so `add` rewrites every `@/lib/...` / `@/hooks/...` import in copied **`component`**-type files to a relative path pointing at wherever the user's `thaizip.config.json` actually placed `libDir`/`hooksDir` — `rewriteTemplateImports` in `src/utils/rewriteImports.ts`. It's a regex-based rewrite over quoted specifiers (not a JS/TS parse), so it's only safe to run over trusted, maintainer-authored template content — not arbitrary user files.

## CLI flags

```
react-thaizip init [--yes]
react-thaizip add [component...] [--yes] [--overwrite]
react-thaizip --help
react-thaizip --version
```

- `--yes` / `-y` — skip confirmation prompts (both `init` and `add`)
- `--overwrite` — overwrite existing component files without prompting (`add` only)
- `--help` / `-h` — print usage and the list of `component`-type registry items (the `lib`/`hook` items are internal-only and not listed)
- `--version` / `-v` — print the CLI's own package version

## Tailwind prerequisite

Tailwind CSS is a **prerequisite**, not something this CLI installs. `init` detects the project's Tailwind version via `detectTailwind.ts` (v3 config file vs. v4 `@import "tailwindcss"`) and fails with an install pointer if none is found. Once detected:
- The shadcn-style CSS custom-property tokens are appended to the project's global CSS file (or printed for manual copy if no CSS file is found), via `tokens.ts` / `ensureTokens`.
- For Tailwind v3, `init` also prints a `theme.extend` config snippet (`buildV3ConfigSnippet`) the user must add by hand — v3 has no `@theme inline` equivalent.

## Project structure detection

`detectProjectStructure.ts` decides the component directory:

| Condition | Component directory |
|-----------|---------------------|
| `app/` exists | `app/components/` (Next.js App Router) |
| `pages/` exists | `components/` (Next.js Pages Router) |
| Neither | `src/components/` (fallback) |

## Components

- `ThaiAddressAutocomplete` (`thai-address-autocomplete.tsx`) — free-text address autocomplete built on `@base-ui/react`'s `Combobox`. Props: controlled/uncontrolled `value`/`defaultValue`/`onValueChange` (`ResolvedThaiAddress | null`), `name` (renders 4 hidden `${name}-subdistrict|-district|-province|-zipcode` inputs), `locale` (`'th' | 'en'`), `texts` (`Partial<Texts>`), `limit`/`debounce`/`threshold` (passed to `useThaiAddressAutocomplete`), `disabled`/`required`/`onBlur`/`onError`, four className slots (`className`/`inputClassName`/`popupClassName`/`itemClassName`), and a forwarded `ref`. Authored against `@/lib/utils` + `@/hooks/use-thai-address-index`, rewritten to relative imports at scaffold time (see "Template import rewriting" above).
- `ThaiAddressCascadeSelect` — legacy province > district > sub-district select flow; unchanged in Phase 2, pending a Base UI-based redesign in a later phase.

## Key constants (`src/utils/config.ts`)

- `CORE_PACKAGE_VERSION` — the `thaizip` version range (`>=0.7.0`) that `init` installs into the target project. Keep in sync with the published `thaizip` package.
- `MINIMUM_THAIZIP_VERSION` (`0.7.0`) — the floor `add` enforces against an already-installed `thaizip` before writing components, since the scaffolded templates rely on the cascade/enumeration API and bilingual labels introduced in that version.

## Build details

- `tsup` bundles `src/cli.ts` → `dist/cli.js` as ESM, prepends `#!/usr/bin/env node`
- `dts: false` — no type declarations emitted (it's a CLI, not a library)
- `dist/` and `templates/` are both included in the published npm package
- `@base-ui/react`, `clsx`, `tailwind-merge`, `react`, `react-dom` are `devDependencies` here (needed to author/typecheck/test the templates and this repo's own RTL tests) — they are never bundled into `dist/`. `add` installs them into the *target* project instead, per registry item's own `dependencies` list.

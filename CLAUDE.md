# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

`react-thaizip` is a CLI scaffold tool (`npx react-thaizip init` / `npx react-thaizip add <component>`) that detects a user's React/Next.js project layout, installs `thaizip`, and writes ready-to-use Thai address components into the appropriate directory — similar to shadcn/ui.

## Commands

```bash
npm run build      # compile src/ → dist/ via tsup (ESM, Node 18 target)
npm test           # run all tests with vitest
npm run typecheck  # tsc --noEmit
```

Run a single test file:
```bash
npx vitest run tests/detectPM.test.ts
```

## Architecture

```
src/cli.ts                      # Entry point — parses argv/flags, routes to commands, prints help/version
src/registry.ts                 # RegistryItem model + resolver (multi-file items, aliases, dependencies)
src/commands/
  add.ts                        # "add" command: resolves targets, version-gates thaizip, writes component files
  init.ts                       # "init" command: detects project layout + Tailwind, writes design tokens, writes config
src/utils/
  config.ts                     # thaizip.config.json (v2) read/write/migrate; CORE_PACKAGE_VERSION, MINIMUM_THAIZIP_VERSION
  detectPM.ts                   # Infers npm/yarn/pnpm/bun from lockfiles (bun.lock, bun.lockb, ...)
  detectProjectStructure.ts     # Decides where to write components (see below)
  detectTailwind.ts             # Detects Tailwind v3 vs v4 and locates the global CSS file
  tokens.ts                     # Design-token block + Tailwind v3 config snippet + CSS token writer
  install.ts                    # Generic package install helper
  copyTemplate.ts               # Copies template files to the destination directory
  fs.ts                         # Thin fs wrapper (pathExists, etc.)
  packageJson.ts                # Reads/checks package.json dependencies and version ranges
  semver.ts                     # Minimal semver comparison used for the thaizip version gate
  prompt.ts                     # Confirm-prompt helper (respects --yes)
templates/react/
  ts/                           # TypeScript component templates (TS-only; no JS templates)
    ThaiAddressAutocomplete.tsx
    ThaiAddressCascadeSelect.tsx
tests/                          # Vitest unit tests, one file per util + command
```

## Component registry

Components are resolved by name or alias in `src/registry.ts` against the `RegistryItem` model (multi-file: each item lists one or more `TemplateFile`s with their own target directory, plus `dependencies` and `registryDependencies`). Supported targets for `add`:
- `autocomplete` / `thai-address-autocomplete` / `ThaiAddressAutocomplete`
- `cascade` / `cascade-select` / `thai-address-cascade-select` / `ThaiAddressCascadeSelect`

Multiple targets can be passed at once: `npx react-thaizip add autocomplete cascade-select`

## CLI flags

```
react-thaizip init [--yes]
react-thaizip add [component...] [--yes] [--overwrite]
react-thaizip --help
react-thaizip --version
```

- `--yes` / `-y` — skip confirmation prompts (both `init` and `add`)
- `--overwrite` — overwrite existing component files without prompting (`add` only)
- `--help` / `-h` — print usage and the list of registry components
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

## Key constants (`src/utils/config.ts`)

- `CORE_PACKAGE_VERSION` — the `thaizip` version range (`>=0.7.0`) that `init` installs into the target project. Keep in sync with the published `thaizip` package.
- `MINIMUM_THAIZIP_VERSION` (`0.7.0`) — the floor `add` enforces against an already-installed `thaizip` before writing components, since the scaffolded templates rely on the cascade/enumeration API and bilingual labels introduced in that version.

## Build details

- `tsup` bundles `src/cli.ts` → `dist/cli.js` as ESM, prepends `#!/usr/bin/env node`
- `dts: false` — no type declarations emitted (it's a CLI, not a library)
- `dist/` and `templates/` are both included in the published npm package

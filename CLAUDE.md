# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

`react-thaizip` is a CLI scaffold tool (`npx react-thaizip add <component>`) that detects a user's React/Next.js project layout, installs `thaizip`, and writes ready-to-use Thai address components into the appropriate directory — similar to shadcn/ui.

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
src/cli.ts                      # Entry point — parses argv, routes to commands
src/commands/
  add.ts                        # "add" command: resolves targets, writes component files
  init.ts                       # "init" command: detects project layout, writes config
src/utils/
  config.ts                     # thaizip.config.json read/write; CORE_PACKAGE_VERSION constant
  detectPM.ts                   # Infers npm/yarn/pnpm/bun from lockfiles (bun.lock, bun.lockb, ...)
  detectProjectStructure.ts     # Decides where to write components (see below)
  detectLanguage.ts             # Detects TypeScript vs JavaScript from project files
  detectTailwind.ts             # Checks for Tailwind in package.json/config
  installTailwind.ts            # Runs tailwindcss init via the detected PM
  install.ts                    # Generic package install helper
  copyTemplate.ts               # Copies template files to the destination directory
  fs.ts                         # Thin fs wrapper (pathExists, etc.)
  packageJson.ts                # Reads/checks package.json dependencies
  registry.ts                   # Maps component names/aliases to registry entries
templates/react/
  ts/                           # TypeScript component templates (4 components)
    ThaiAddressAutocomplete.tsx
    ThaiAddressPostalCodeForm.tsx
    ThaiAddressCascadeSelect.tsx
    ThaiAddressDisplayFields.tsx
  js/                           # JavaScript component templates (mirrors ts/)
tests/                          # Vitest unit tests, one file per util + command
```

## Component registry

Components are resolved by name or alias in `src/utils/registry.ts`. Supported targets for `add`:
- `autocomplete` / `ThaiAddressAutocomplete`
- `ThaiAddressPostalForm` / `postal` / `ThaiAddressPostalCodeForm`
- `ThaiAddressCascadeSelect` / `cascade` / `cascade-select`
- `fields` / `ThaiAddressSearch` / `ThaiAddressDisplayFields`

Multiple targets can be passed at once: `npx react-thaizip add autocomplete cascade-select`

## Project structure detection

`detectProjectStructure.ts` decides the component directory:

| Condition | Component directory |
|-----------|---------------------|
| `app/` exists | `app/components/` (Next.js App Router) |
| `pages/` exists | `components/` (Next.js Pages Router) |
| Neither | `src/components/` (fallback) |

## Key constants

- `CORE_PACKAGE_VERSION` in `src/utils/config.ts` — the `thaizip` version range installed by `init`. Keep in sync with the published `thaizip` package.

## Build details

- `tsup` bundles `src/cli.ts` → `dist/cli.js` as ESM, prepends `#!/usr/bin/env node`
- `dts: false` — no type declarations emitted (it's a CLI, not a library)
- `dist/` and `templates/` are both included in the published npm package

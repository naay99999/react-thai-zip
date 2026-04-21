# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

`react-thaizip` is a CLI scaffold tool (`npx react-thaizip add autocomplete`) that detects a user's React/Next.js project layout, installs `thaizip`, optionally installs Tailwind CSS, and writes `ThaiAddressAutocomplete.tsx` into the appropriate component directory.

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
src/cli.ts                  # Entry point — parses argv, routes to commands
src/commands/add.ts         # Orchestrates the full "add autocomplete" flow
src/utils/
  detectPM.ts               # Infers npm / yarn / pnpm / bun from lockfiles
  detectProjectStructure.ts # Decides where to write the component (see below)
  detectTailwind.ts         # Checks for Tailwind in package.json / config
  installTailwind.ts        # Runs tailwindcss init via the detected PM
  install.ts                # Generic package install helper
  copyTemplate.ts           # Copies templates/react/ThaiAddressAutocomplete.tsx
  fs.ts                     # Thin fs wrapper (pathExists, etc.)
templates/react/ThaiAddressAutocomplete.tsx   # The component written to user projects
tests/                      # Vitest unit tests, one file per util + cli
```

### Project structure detection logic (`detectProjectStructure.ts`)

| Condition | Destination |
|-----------|-------------|
| `app/` directory exists | `app/components/ThaiAddressAutocomplete.tsx` (Next.js App Router) |
| `pages/` directory exists | `components/ThaiAddressAutocomplete.tsx` (Next.js Pages Router) |
| Neither | `src/components/ThaiAddressAutocomplete.tsx` (fallback) |

### Build details

- `tsup` bundles `src/cli.ts` → `dist/cli.js` as ESM, prepends `#!/usr/bin/env node`
- `dts: false` — no type declarations emitted (it's a CLI, not a library)
- `dist/` and `templates/` are both included in the published npm package

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

`react-thaizip` is a CLI scaffold tool (`npx react-thaizip init` / `npx react-thaizip add <component>`) that detects a user's React/Next.js project layout, installs `thaizip`, and writes ready-to-use Thai address components into the appropriate directory — similar to shadcn/ui.

`AGENTS.md` at the repo root is a symlink to this file — editing this file covers both; don't replace the symlink with a copy.

## Commands

```bash
npm run build                # compile src/ → dist/ via tsup (ESM, Node 18 target)
npm test                     # run all tests with vitest
npm run typecheck            # tsc --noEmit
npm run typecheck:templates  # chains 4 tsc -p runs (vanilla + one per shadcn engine — base/radix/aria); see "Testing setup"
npm run sandbox                # regenerate apps/sandbox (gitignored Next.js playground pinned to the docs stack)
npm run sandbox -- --npm       # same, but prints npx react-thaizip@latest steps instead of local dist/cli.js (--npm=<version> pins a version)
```

Run a single test file:
```bash
npx vitest run tests/detectPM.test.ts
```

Use Node **22.9+** locally (CI pins Node 24). `engines.node: ">=18"` describes the *published* CLI, not this repo's dev loop — jsdom 30's undici needs `util.markAsUncloneable`, so `npm test` fails on Node 18/20.

## Architecture

```
src/cli.ts                      # Entry point — parses argv/flags, routes to commands, prints help/version
src/registry.ts                 # RegistryItem model + resolver (multi-file items, aliases, dependencies, registryDependencies, exportName)
src/commands/
  add.ts                        # "add" command: resolves targets + transitive registryDependencies, version-gates thaizip, writes files, strips TS for JS-target projects, rewrites @/ imports
  init.ts                       # "init" command: detects project layout + Tailwind + TypeScript, writes design tokens, writes config
src/utils/
  config.ts                     # thaizip.config.json (v4) read/write/migrate; CORE_PACKAGE_VERSION, MINIMUM_THAIZIP_VERSION, ShadcnBase/SHADCN_BASES
  detectPM.ts                   # Infers npm/yarn/pnpm/bun from lockfiles (bun.lock, bun.lockb, ...); per-PM install/add/exec/dlx command shapes
  detectProjectStructure.ts     # Decides where to write components (see below)
  detectShadcn.ts               # Detects an existing shadcn/ui project (components.json) and maps its style prefix to a ShadcnBase (base/radix/aria); resolves the ui alias/dir for `init`
  detectTailwind.ts             # Detects Tailwind v3 vs v4 and locates the global CSS file
  detectTypeScript.ts           # Detects TypeScript presence via tsconfig.json; auto-detection for `init`
  tokens.ts                     # Design-token block + Tailwind v3 config snippet + CSS token writer
  stripTypes.ts                 # Strips TS syntax from templates for JS-target projects; maps .tsx/.ts to .jsx/.js
  install.ts                    # Generic package install helper; runPackageManagerExec (local bin) + runPackageManagerDlx (fetch-and-run a remote spec)
  copyTemplate.ts               # Copies template files to the destination directory
  rewriteImports.ts             # Rewrites templates' authored `@/lib/*`, `@/hooks/*`, and `@/components/ui/*` imports to relative paths at scaffold time
  shadcnPrimitives.ts           # ensureShadcnPrimitives: runs `shadcn@latest add` (via dlx) for whichever shadcn/ui primitives a style: 'shadcn' project is missing
  fs.ts                         # Thin fs wrapper (pathExists, pathExistsNoFollow, etc.)
  packageJson.ts                # Reads/checks package.json dependencies and version ranges
  pathSafety.ts                 # Path-containment guards for the write path (lexical + symlink-resolving)
  semver.ts                     # Minimal semver comparison used for the thaizip version gate
  prompt.ts                     # Confirm-prompt helper (respects --yes)
templates/react/
  ts/                           # TypeScript component templates (TS-authored; JS output derived via stripTypes at scaffold time)
    thai-address-autocomplete.tsx    # Base UI Combobox-based autocomplete (imports `@/lib/utils` + `@/hooks/use-thai-address-index`)
    thai-address-cascade-select.tsx  # Base UI Select ×3 cascade (imports `@/lib/utils` + `@/hooks/use-thai-address-index`)
    thai-address-form.tsx            # house-no/moo/soi/street + embedded ThaiAddressCascadeSelect (imports `@/lib/utils` + `./thai-address-cascade-select`)
    thai-address-display.tsx         # read-only <address> formatter, no index/Base UI (imports `@/lib/utils` only)
    thai-address-form-field.tsx      # react-hook-form Controller wrapper around ThaiAddressCascadeSelect (imports `@/lib/utils` + `./thai-address-cascade-select`)
    lib/utils.ts                     # cn() class-name helper (clsx + tailwind-merge) — shared registry item
    hooks/use-thai-address-index.ts    # loads the bundled thaizip index — shared registry item
    hooks/use-thai-address-cascade.ts  # engine-free province>district>sub-district cascade state machine — shared registry item, used by every cascade-consuming template (vanilla + all three shadcn engines)
    shadcn/                          # shadcn-style variants of the four interactive components, selected by selectVariant(item, config.style, config.shadcnBase) (see "Component registry" below)
      base/                           # composes Base UI–backed shadcn primitives (components.json style: base-*)
        thai-address-autocomplete.tsx    # Popover + Command + Button (imports `@/lib/utils` + `@/hooks/use-thai-address-*` + `@/components/ui/*`)
        thai-address-cascade-select.tsx  # Select ×3 + Label + Button + Input, built on the shared cascade hook
        thai-address-form.tsx            # Input + Label + embedded shadcn ThaiAddressCascadeSelect (imports `./thai-address-cascade-select`)
        thai-address-form-field.tsx      # react-hook-form wrapper around the embedded shadcn ThaiAddressCascadeSelect
      radix/                          # composes Radix-backed shadcn primitives (style: radix-*, or legacy default/new-york) — same four filenames, near-identical to base/ with two commented divergences (see "Component styles" below)
        thai-address-autocomplete.tsx
        thai-address-cascade-select.tsx
        thai-address-form.tsx
        thai-address-form-field.tsx
      aria/                           # composes React Aria Components–backed shadcn primitives (style: aria-*) — authored fresh against RAC's own API, same four filenames
        thai-address-autocomplete.tsx
        thai-address-cascade-select.tsx
        thai-address-form.tsx
        thai-address-form-field.tsx
      __fixtures__/                    # test-only vendored shadcn CLI output backing typecheck:templates + vitest's `@/components/ui/*` aliases; excluded from the published package via package.json's `files` negation
        base/components/ui/*.tsx         # vendored `shadcn add -b base` output (older registry snapshot — see "Build details")
        radix/components/ui/*.tsx        # vendored `shadcn add -b radix` output
        aria/components/ui/*.tsx         # vendored `shadcn add -b aria` output
tsconfig.templates.json          # standalone tsconfig for the vanilla templates + lib/ + hooks/ + the seven vanilla RTL tests (six component-render tests plus the cascade hook test) — no @/components/ui/* paths
tsconfig.templates.base.json     # same shape, scoped to shadcn/base/** + that engine's four RTL tests, @/components/ui/* mapped at __fixtures__/base
tsconfig.templates.radix.json    # same, scoped to shadcn/radix/**, mapped at __fixtures__/radix
tsconfig.templates.aria.json     # same, scoped to shadcn/aria/**, mapped at __fixtures__/aria
tests/                          # Vitest unit tests, one file per util + command
  thai-address-autocomplete.test.tsx  # RTL/jsdom test for the vanilla Base UI autocomplete
  thai-address-cascade-select.test.tsx  # RTL/jsdom test for the vanilla Base UI cascade select
  thai-address-form.test.tsx          # RTL/jsdom test for the cascade-embedding composite
  thai-address-display.test.tsx       # RTL/jsdom test for the read-only formatter
  thai-address-form-field.test.tsx    # RTL/jsdom test for the react-hook-form wrapper
  use-thai-address-cascade.test.tsx   # unit tests for the extracted cascade hook itself
  thai-address-autocomplete.{base,radix,aria}.test.tsx    # 3 files — RTL/jsdom test for the shadcn-style autocomplete, one per engine
  thai-address-cascade-select.{base,radix,aria}.test.tsx  # 3 files — same, cascade select
  thai-address-form.{base,radix,aria}.test.tsx            # 3 files — same, form composite
  thai-address-form-field.{base,radix,aria}.test.tsx      # 3 files — same, react-hook-form wrapper
  shared/                              # engine-independent assertion bodies (autocompleteBehaviour.tsx, cascadeSelectBehaviour.tsx, formBehaviour.tsx, formFieldBehaviour.tsx), imported and parameterized by each per-engine test file so a behavioural change is asserted three times without being written three times
  detectShadcn.test.ts                # unit tests for shadcn/ui project detection + style→base mapping
  shadcnPrimitives.test.ts            # unit tests for ensureShadcnPrimitives (existence check, dlx invocation, typescript-aware extension)
  registryShadcnConsistency.test.ts   # cross-checks each engine's shadcn templates' real @/components/ui/* imports against the registry's declared shadcnPrimitives, for all three bases
  rewriteImports.test.ts              # unit tests for @/lib, @/hooks, @/components/ui import rewriting
  docs-site.test.ts                   # structure guards for the apps/docs website
apps/
  docs/                          # Documentation website (Fumadocs on Next.js) — own package.json + lockfile, bilingual th (root locale) / en, imports templates via the @ alias, deployed on Vercel (root directory apps/docs)
  sandbox/                       # Generated by `npm run sandbox` (scripts/sandbox.mjs, pinned to apps/docs dependency versions) for testing the scaffolded components + CLI — gitignored, never committed
                                  # `npm run sandbox -- --npm[=<version>]` switches the printed CLI steps to `npx react-thaizip@<version>`, to test the published package instead of the local dist/cli.js build
superpowers/                     # SDD specs, plans, and verification reports (tracked design documents)
```

## Component registry

Components are resolved by name or alias in `src/registry.ts` against the `RegistryItem` model (multi-file: each item lists one or more `TemplateFile`s with their own target directory, plus `dependencies` and `registryDependencies`). Eight registry items exist; only the five `component`-type ones are directly selectable (via `add [target]` or the interactive multiselect / `--help` listing) — the three `lib`/`hook` items are pulled in transitively:

- `autocomplete` / `thai-address-autocomplete` / `ThaiAddressAutocomplete` — `component`; `registryDependencies: ['utils', 'use-thai-address-index']`
- `cascade` / `cascade-select` / `thai-address-cascade-select` / `ThaiAddressCascadeSelect` — `component`; `registryDependencies: ['utils', 'use-thai-address-index', 'use-thai-address-cascade']`
- `address-form` / `thai-address-form` / `ThaiAddressForm` — `component`; embeds `ThaiAddressCascadeSelect` by direct relative import (shadcn-style file reuse, not an npm import — both land in `componentDir`) and layers house-number/moo/soi/street free text on top; `registryDependencies: ['utils', 'use-thai-address-index', 'cascade-select']` (both hooks are pulled in transitively for the embedded cascade's own use — this file doesn't call either directly)
- `address-display` / `thai-address-display` / `ThaiAddressDisplay` — `component`; read-only, purely presentational; `registryDependencies: ['utils']` (no hook)
- `address-form-field` / `thai-address-form-field` / `ThaiAddressFormField` — `component`; a react-hook-form `Controller` wrapper embedding `ThaiAddressCascadeSelect` by the same direct relative import as `address-form`; `registryDependencies: ['utils', 'use-thai-address-index', 'cascade-select']` (same transitive-hook rationale as `address-form`); `dependencies` additionally includes `react-hook-form`
- `utils` / `cn` — `lib`; writes `<libDir>/utils.ts` (`cn()` via clsx + tailwind-merge)
- `use-thai-address-index` / `index-hook` — `hook`; writes `<hooksDir>/use-thai-address-index.ts` (loads the bundled thaizip index)
- `use-thai-address-cascade` / `cascade-hook` — `hook`; writes `<hooksDir>/use-thai-address-cascade.ts` — the extracted, engine-free province>district>sub-district state machine (`Option`/`SelectionIds`/`ThaiAddressCascadeSelectTexts` types, `DEFAULT_CASCADE_TEXTS`, `optionName`, and `useThaiAddressCascade`) shared by the vanilla cascade template and all three shadcn engine variants — one hook serves four JSX shells instead of the state machine being copy-pasted into each. Not directly selectable, same as `use-thai-address-index`. Only `cascade-select` names it in `registryDependencies`; `address-form`/`address-form-field` pick it up transitively through their existing `cascade-select` dependency, since neither calls it directly.

Both `address-form.tsx` and `address-form-field.tsx` import `thai-address-cascade-select.tsx` by plain relative path rather than through the registry/npm system, so nothing validates that coupling at scaffold time: renaming the file, or renaming its `ThaiAddressCascadeSelect`/`ThaiAddressCascadeSelectTexts` exports, must be updated in lockstep everywhere that file is embedded. That coupling is now **four-way** — the vanilla `thai-address-cascade-select.tsx` plus the `base`/`radix`/`aria` shadcn variants each have their own `thai-address-form.tsx`/`thai-address-form-field.tsx` embedding their own engine's cascade select — so a rename touches up to eight files, not two (each carries a comment noting this).

`resolveWithDependencies` topologically expands `registryDependencies` (cycle-checked) before any files are written, so `add autocomplete` also writes the `utils` and `use-thai-address-index` files without either needing to be named explicitly. `lib`/`hook` files are protected by default — neither a bare `add` nor `--yes` touches them once present (users hand-edit `lib/utils.ts`), but an explicit `--overwrite` now refreshes them too; `component` files additionally respect the interactive overwrite prompt. `RegistryItem.exportName` supplies the named export for the post-scaffold "import it from" hint when it can't be derived from the (possibly kebab-case) filename.

Multiple targets can be passed at once: `npx react-thaizip add autocomplete cascade-select`

Four of the five `component` items — `autocomplete`, `cascade-select`, `address-form`, `address-form-field` — carry an additional `shadcn` block, now typed `Partial<Record<ShadcnBase, ShadcnVariant>>` (`ShadcnVariant` = `files`/`dependencies`/`shadcnPrimitives`), selected by `selectVariant(item, config.style, config.shadcnBase)` instead of the item's own top-level `files`/`dependencies` when `style === 'shadcn'` and a variant exists for that project's `shadcnBase`. All four currently declare all three bases (`base`, `radix`, `aria`), so the vanilla-fallback branch of `selectVariant` (used when `style === 'vanilla'`, or when `style === 'shadcn'` but the item has no entry for that base) is exercised today only by `address-display` and the two `lib`/`hook` items — but it stays load-bearing: it is what lets a component ship shadcn variants for only some bases without every registry item forking three ways, and it is the safety net if a future fourth engine is added before all four templates exist for it. Their shadcn-style templates live under `templates/react/ts/shadcn/<base>/` (same filenames as the vanilla ones, one directory per engine) and compose the target project's own shadcn/ui primitives (`@/components/ui/*`) for whichever engine backs them, instead of raw `@base-ui/react`. `address-display` has no shadcn variant — it's presentational only, no interactive primitive, same file for every style/base. `utils`/`use-thai-address-index`/`use-thai-address-cascade` are likewise unforked (`registryDependencies` stays identical across styles and bases; only `files`/`dependencies`/`shadcnPrimitives` differ per component).

Before writing any files, `add` (style `'shadcn'` only) collects the union of `shadcnPrimitives` across the whole resolved item list and runs `shadcn@latest add <missing...>` (`ensureShadcnPrimitives` in `src/utils/shadcnPrimitives.ts`) for whichever of the target project's own `@/components/ui/*` files don't exist yet — checked at `.tsx` or `.jsx` depending on `config.typescript`, since a JS-target shadcn project (`components.json`'s `"tsx": false`) emits `.jsx` primitives. That invocation goes through `runPackageManagerDlx` (`src/utils/install.ts`), which maps to the target project's own package manager's fetch-and-run command — `npx --yes`/`pnpm dlx`/`yarn dlx`/`bunx` — since `shadcn@latest` is a remote package spec that needs fetching, not a `node_modules/.bin` binary (that's what the separate, unused-here `exec`/`runPackageManagerExec` pair is for). Never passes `-b`/`--base` itself, since the project's own `components.json` already pins the component library. `--yes` on `add` propagates as `-y` to that shadcn CLI invocation too. A failure here (network, or the shadcn CLI itself erroring) is caught, printed with a manual-retry hint, and exits before any files are written — mirroring the dependency-install failure handling just above it in `add.ts`.

## Template import rewriting

Templates that need `lib`/`hook` helpers are authored against a fixed `@/lib/*` / `@/hooks/*` alias (the shadcn/ui convention) so `tsconfig.templates.json` can typecheck them standalone via `npm run typecheck:templates`. Real user projects rarely have that alias wired up, so `add` rewrites every `@/lib/...` / `@/hooks/...` import in copied **`component`**-type files to a relative path pointing at wherever the user's `thaizip.config.json` actually placed `libDir`/`hooksDir` — `rewriteTemplateImports` in `src/utils/rewriteImports.ts`. It's a regex-based rewrite over quoted specifiers (not a JS/TS parse), so it's only safe to run over trusted, maintainer-authored template content — not arbitrary user files.

Shadcn-style **`component`**-type files additionally use `@/components/ui/*` imports, authored against the shadcn CLI's default alias. Unlike `@/lib`/`@/hooks`, this is never rewritten to a relative path — a `style: 'shadcn'` project has `components.json`, which guarantees the `@` alias already works. Only the bare-specifier prefix itself is swapped, to `config.shadcnUiAlias`, and only when that differs from the default (a project that customized `aliases.ui`).

## Component styles (vanilla vs shadcn)

`react-thaizip` scaffolds against one of two styles, decided once at `init` and recorded in `thaizip.config.json` (`style`):

- **`vanilla`** (default) — raw `@base-ui/react` primitives styled with Tailwind utility classes against shadcn-shaped CSS variable tokens. Works in any Tailwind project.
- **`shadcn`** — composes the target project's own installed shadcn/ui primitives (`@/components/ui/*`) instead. Detected from `components.json.style` and mapped to one of three component libraries, recorded separately as `shadcnBase` (see "Key constants"): a `base-*` prefix → `base` (Base UI), `radix-*` → `radix`, `aria-*` → `aria`, and the two legacy bare style names from before the 3-way `-b/--base` split (`default`, `new-york` — shadcn/ui was Radix-only then) → `radix`. All three component libraries are composed against directly; none of them falls back to vanilla any more. An unrecognized style prefix (or no `components.json` at all) still falls back to `style: 'vanilla'`, with `init` printing why.

The four shadcn-style templates (everything except `address-display`) are authored and typechecked against real shadcn-generated fixtures under `templates/react/ts/shadcn/__fixtures__/<base>/components/ui/` — one fixture tree per engine, copies of real `shadcn add` output, not hand-approximated stubs — wired into that engine's own `tsconfig.templates.<base>.json` and `vitest.workspace.ts` project the same way `@/lib/utils`/`@/hooks/use-thai-address-*` already are for the vanilla templates. Like `CORE_PACKAGE_VERSION`, these fixtures are version snapshots and can drift from a future `shadcn` release; see "Build details" for the regeneration recipe.

**`base` and `radix` are near-identical at the template level** — the `radix` templates are the `base` ones with exactly two deliberate, commented divergences, both forced by a real API difference (not a style choice):
- The cascade select's cleared/placeholder state: Base UI's `Select` accepts `value={null}` directly, but Radix's `Select.Root` types `value` as `string` and reserves the **empty string** specifically for "cleared, show the placeholder" (Radix forbids an empty `SelectItem` value for exactly this reason). The `radix` cascade template converts both directions at the boundary: `value={value === null ? '' : String(value)}` / `onValueChange={(next) => onChange(next === '' ? null : Number(next))}`.
- The autocomplete popup's width variable: Base UI exposes `--anchor-width`; Radix exposes `--radix-popover-trigger-width`. The `radix` autocomplete template's `PopoverContent` uses `w-[var(--radix-popover-trigger-width)]`.

**`aria` (React Aria Components) is a genuinely different API** and is authored fresh, not patched from `base`/`radix`. The templates encode:
- The cascade select is RAC's own `Select`: selection is `selectedKey`/`onSelectionChange` (not `value`/`onValueChange`), cleared state is `selectedKey={null}` (supported natively, no sentinel needed), and each `SelectItem` (a `ListBoxItem`) is keyed by `id` + `textValue` rather than `value`. The three triggers take `isDisabled`/`isRequired`/`isInvalid` (RAC's own boolean-prop naming) instead of `disabled`/`required`/`aria-invalid`, and buttons fire `onPress`, not `onClick`.
- The autocomplete's `Command` wraps RAC's `Autocomplete` and **always applies a filter** (`filter={props.filter || contains}` internally) — since `thaizip`'s suggestions are already filtered server-side, the aria autocomplete template must pass `filter={() => true}` explicitly, or Thai text gets silently double-filtered.
- There is **no `PopoverContent`** in the aria-backed shadcn registry — `Popover` *is* the content, and `PopoverTrigger` is RAC's `DialogTrigger`. The popup width variable is `--trigger-width` (RAC's own, via `w-(--trigger-width)`), not `--anchor-width`/`--radix-popover-trigger-width`.
- `CommandItem` selection fires `onAction` (via `CommandList`), not `onSelect`.

**Two RAC-specific traps worth knowing before touching the aria templates:**
- **The `aria-invalid` trap.** RAC's `Button` runs every prop through `filterDOMProps`, whose allowlist excludes `aria-invalid` — so passing `aria-invalid` as a prop to anything built on RAC's `Button` (the cascade's three select triggers, the autocomplete's popover trigger) silently never reaches the DOM, no error, no warning. Both aria templates work around this with a commented imperative ref effect that calls `node.setAttribute('aria-invalid', 'true')` / `removeAttribute` directly on the real button element. This is **not** needed for text inputs: RAC's `Input` forwards `disabled`/`required`/`aria-invalid` straight through as ordinary native DOM props (`TextField`/`Input` aren't built on `filterDOMProps` the way `Button`/`Select` are), so the house-number field in the aria `thai-address-form`/`thai-address-form-field` templates needs no workaround. The asymmetry — same prop, works on one primitive, silently dropped on another — is the surprising part; don't assume a fix for one covers the other.
- **The `CommandInput` ref workaround.** The vendored aria `command` fixture types `CommandInput` as a plain function taking `InputProps`, with no `RefAttributes` — so a caller's `ref` cannot be passed to it directly. The aria autocomplete template works around this by wrapping `CommandInput` in a plain `<div>` with a callback ref, then resolving the actual `<input>` via `node?.querySelector('[data-slot="command-input"]')` inside that callback. That selector string is owned by the vendored fixture's own DOM output, not by our code — if a fixture regeneration changes the `data-slot` value or markup shape, this resolution silently breaks; treat it as a known regeneration hazard, not a one-time fix.

**Engine behaviour differences, verified empirically, not assumed** (relevant when writing or reviewing cascade/select tests across engines):
- **Re-selecting an already-selected value fires a change event on Base UI, but not on Radix or React Aria.** Base UI's `Select` calls `onValueChange` even when the reselected value is unchanged. Radix's `Select` does not fire `onValueChange` at all for a same-value reselect (confirmed with `userEvent`, raw `fireEvent`, and keyboard `Enter` against a bare fixture, no cascade code involved). React Aria traces the same behavior down to `useSelectState`'s `setValue()`, which gates the outer `onSelectionChange` prop on the key actually changing (RAC's internal selection-manager callback re-fires on every click including a reselect, but that internal call never reaches the prop we pass to `<Select>`). A shared cascade/select test that reselects the *same* option to assert "nothing changes" will pass trivially on radix/aria for the wrong reason and must instead pick a genuinely different option to be a real assertion.
- **Base UI's `SelectPositioner` self-heals a stale controlled value.** When a `<Select>`'s own item list changes size across a render (e.g. the district select's amphure list changes because the province changed) and the current controlled value no longer matches any item in the new list, Base UI calls that `Select`'s own `onValueChange(null)` **automatically** — a real, permanent library behavior, not a test artifact. This can silently perform a downstream reset that masks a bug in application code that was supposed to perform that reset itself (verified: a deliberately broken `setProvince` that stopped resetting `amphureId` still passed on `shadcn-base` because Base UI's self-heal reset it anyway one render later, while the identical regression failed immediately and correctly on `shadcn-radix`). Neither Radix's `Select.Root` nor React Aria's `useListState`/`useSelectState` has an equivalent mechanism — Base UI is the outlier on both this and the reselect behavior above, and is therefore the engine most likely to mask a cascade bug. **A shared assertion that passes only on `base` should be treated as suspect**, not as evidence the other two engines have a gap.

## Write-path containment

`thaizip.config.json` lives in the target repo, so its `componentDir`/`libDir`/`hooksDir` are untrusted input that `add` joins straight onto the project root to build write paths. Three layers keep a scaffolded file inside the project:

1. `validateConfig` (`src/utils/config.ts`) rejects a directory that is absolute, contains a `..` segment, or contains a character that would break out of the import string literal the templates get rewritten with. A bad config fails at read time with the usual "re-run init" error, before anything is written.
2. `assertPathInsideRoot` / `assertRealPathInsideRoot` (`src/utils/pathSafety.ts`) re-check each destination in `add.ts` — the second one resolves symlinks (including dangling ones, by hand via `readlink`) so a `components -> ../../elsewhere` directory or a link planted at the destination can't route the write outside the project. It runs *before* `mkdir`, so nothing is created on the way out.
3. `pathExistsNoFollow` (`src/utils/fs.ts`) is used instead of `pathExists` on the write path: `access()` reports a dangling symlink as "nothing here", which used to let one slip past the never-overwrite guard for `lib`/`hook` files and have `copyFile` write through the link.

`rewriteTemplateImports` also escapes the computed path for its quote style and refuses a specifier tail that escapes the root. Keep all of this when touching the write path — `tests/pathSafety.test.ts`, the containment block in `tests/add.test.ts`, and the string-literal-safety block in `tests/rewriteImports.test.ts` are the regression coverage.

## CLI flags

```
react-thaizip init [--yes]
react-thaizip add [component...] [--yes] [--overwrite]
react-thaizip --help
react-thaizip --version
react-thaizip init --help
react-thaizip add --help
```

- `--yes` / `-y` — skip confirmation prompts (both `init` and `add`)
- `--overwrite` — overwrite existing files without prompting, including the otherwise-protected `lib`/`hook` files (`add` only)
- `--help` / `-h` — print usage and the list of `component`-type registry items (the `lib`/`hook` items are internal-only and not listed)
- `--version` / `-v` — print the CLI's own package version
- `--help` after a command prints command-scoped usage; `--help` wins over `--version` when both are passed

## CLI output contract

Both commands' console output is asserted by tests, so treat it as an interface, not decoration:

- `init` prints a **detection summary** (component dir, package manager, Tailwind version + CSS file) *before* any prompt — which is why `detectTailwind` runs before the `componentDir` prompt, so a Tailwind-less project aborts without first asking a question. Every manual follow-up (the Tailwind v3 `theme.extend` snippet, the "no CSS file found" token block) is collected in a `manualSteps` array and flushed **once at the very end** under `=== Manual steps required ===`, after the npm install noise, then a closing `Next: run ...` line. Don't move these prints back inline — being buried under install output was the original bug.
- `add` prints one `Wrote <path>.` / `Updated <path>.` line per file actually written (a `lib`/`hook`-only refresh would otherwise succeed in total silence), and distinguishes its two skip reasons: `(already exists).` for a declined component vs. `(protected; pass --overwrite to update it).` for lib/hook.

## Registry staleness (`registryVersion`)

`thaizip.config.json`'s `registryVersion` is live data, not bookkeeping: `add` compares it against `getRegistryVersion()` and, when a protected `lib`/`hook` file is skipped while the recorded version is older, warns that the file predates the current registry and prints the exact `add <item> --overwrite` command to refresh it. After any `add` that actually writes a file, `registryVersion` is rewritten to the current CLI version via `writeConfig`. Anything that changes a `lib`/`hook` template's contract depends on this — keep the comparison in place.

## Tailwind prerequisite

Tailwind CSS is a **prerequisite**, not something this CLI installs. `init` detects the project's Tailwind version via `detectTailwind.ts` (v3 config file vs. v4 `@import "tailwindcss"`) and fails with an install pointer if none is found. Once detected:
- The shadcn-style CSS custom-property tokens are appended to the project's global CSS file (or printed for manual copy if no CSS file is found), via `tokens.ts` / `ensureTokens`.
- For Tailwind v3, `init` also prints a `theme.extend` config snippet (`buildV3ConfigSnippet`) the user must add by hand — v3 has no `@theme inline` equivalent.

## Project structure detection

`detectProjectStructure.ts` decides the component, lib, and hooks directories together — `libDir`/`hooksDir` follow the same signal as `componentDir` (not independently detected, and no prompt for either — `init.ts` takes them as-is):

| Condition | Component directory | Lib directory | Hooks directory |
|-----------|---------------------|----------------|------------------|
| `app/` exists | `app/components/` (Next.js App Router) | `lib/` | `hooks/` |
| `pages/` exists | `components/` (Next.js Pages Router) | `lib/` | `hooks/` |
| Neither | `src/components/` (fallback, assumes a `src/` layout) | `src/lib/` | `src/hooks/` |

## Components

- `ThaiAddressAutocomplete` (`thai-address-autocomplete.tsx`) — free-text address autocomplete built on `@base-ui/react`'s `Combobox`. Props: controlled/uncontrolled `value`/`defaultValue`/`onValueChange` (`ResolvedThaiAddress | null`), `name` (renders 4 hidden `${name}-subdistrict|-district|-province|-zipcode` inputs), `locale` (`'th' | 'en'`), `texts` (`Partial<Texts>`), `limit`/`debounce`/`threshold` (passed to `useThaiAddressAutocomplete`), `disabled`/`required`/`onBlur`/`onError`, four className slots (`className`/`inputClassName`/`popupClassName`/`itemClassName`), and a forwarded `ref`. Authored against `@/lib/utils` + `@/hooks/use-thai-address-index`, rewritten to relative imports at scaffold time (see "Template import rewriting" above).
- `ThaiAddressCascadeSelect` (`thai-address-cascade-select.tsx`) — province > district > sub-district cascade built on `@base-ui/react`'s `Select` (×3). Props: controlled/uncontrolled `value`/`defaultValue`/`onValueChange` (`ResolvedThaiAddress | null`), `name` (renders 4 hidden `${name}-subdistrict|-district|-province|-zipcode` inputs), `locale` (`'th' | 'en'`), `texts` (`Partial<Texts>`), `disabled`/`required`/`onBlur`/`onError`/`aria-invalid` (all three triggers), five className slots (`className`/`labelClassName`/`triggerClassName`/`popupClassName`/`itemClassName`), and a `ref` forwarded to the province trigger. Changing a parent select in a way that invalidates a full selection fires `onValueChange(null)` and resets the downstream selects. Built on core `listProvinces`/`listAmphures`/`listTambons`. Authored against `@/lib/utils` + `@/hooks/use-thai-address-index`, rewritten to relative imports at scaffold time (see "Template import rewriting" above).
- `ThaiAddressForm` (`thai-address-form.tsx`) — house-number (required) + optional moo/soi/street free text, layered on top of an embedded `ThaiAddressCascadeSelect` (imported by relative path, see "Component registry" above). Props: controlled/uncontrolled `value`/`defaultValue`/`onValueChange` (`FullThaiAddress | null` — `ResolvedThaiAddress` plus `houseNo`/`moo`/`soi`/`street`), `name` (renders the embedded cascade's own 4 hidden inputs plus 4 more of its own: `${name}-houseno|-moo|-soi|-street`, 8 total), `locale`, `texts` (own labels) and `cascadeTexts` (forwarded to the embedded cascade), `disabled`/`required` (required applies to the house-number field and the embedded cascade only — moo/soi/street stay always-optional)/`onBlur` (house-number input)/`onError`/`aria-invalid`, six className slots (`className`/`labelClassName`/`inputClassName` plus the cascade's own `triggerClassName`/`popupClassName`/`itemClassName`, forwarded through), and a `ref` forwarded to the house-number input. Maintains the embedded cascade's resolved selection in local state regardless of controlled/uncontrolled mode, so a `null` echoed back for "form incomplete" never discards a partial selection. Does not call `useThaiAddressIndex` itself — delegates index-loading/error/retry UI entirely to the embedded cascade. Authored against `@/lib/utils` + a relative `./thai-address-cascade-select` import.
- `ThaiAddressDisplay` (`thai-address-display.tsx`) — read-only `<address>` formatter, no Base UI and no index hook (purely presentational). Props: `value` (`ThaiAddressDisplayValue | null` — `ResolvedThaiAddress` plus optional `houseNo`/`moo`/`soi`/`street`), `locale`, `mode` (`'single-line'` default joins street-portion + locality with `', '`; `'multi-line'` renders them as two rows), `emptyText`, `className`, `lineClassName`, and a `ref` forwarded to the `<address>` element. The locality label always uses this repo's `subdistrict`/`district`/`province`/`zipCode` naming convention (never `formatThaiAddressSuggestion`, which takes a `ThaiAddressRecord` no React template has). The street-portion's "หมู่"/"ซอย" label words switch to their standard English transliterations ("Moo"/"Soi") under `locale="en"` — no Thai text leaks into an English-locale render. Authored against `@/lib/utils` only.
- `ThaiAddressFormField` (`thai-address-form-field.tsx`) — a react-hook-form `Controller` wrapper around an embedded `ThaiAddressCascadeSelect` (same relative-import reuse as `ThaiAddressForm`). Generic over `TFieldValues`; props: `control` (RHF `Control<TFieldValues>`), `name` (RHF `FieldPath<TFieldValues>`), `rules` (RHF's own `RegisterOptions`, minus the value-transform options and `disabled`), `locale`, `texts` (forwarded to the embedded cascade), `disabled`, five className slots (`className`/`labelClassName`/`triggerClassName`/`popupClassName`/`itemClassName`) plus `errorClassName` for the `role="alert"` validation message rendered below the cascade when `fieldState.error` is set. Deliberately does **not** render hidden inputs — RHF's own `handleSubmit` reads form state directly, not native `FormData` — and does not forward `name`/`field.name` to the embedded cascade for that reason (verified by a regression test). Introduces `react-hook-form` as a new dependency (both a registry `dependencies` entry, installed into target projects, and a root devDependency here for authoring/testing).

## Testing setup

- Vitest runs four **projects**, defined in a root `vitest.workspace.ts` via `defineWorkspace([...])`: `vanilla` (everything under `tests/**/*.test.ts(x)` except the three per-engine suffixes) plus `shadcn-base`/`shadcn-radix`/`shadcn-aria` (each scoped to `tests/**/*.<base>.test.tsx`). This repo pins vitest **2.1.9**, which has no `projects` field on `defineConfig` — that's a vitest 3+ API. Multi-project support on 2.x is `vitest.workspace.ts`'s `defineWorkspace`, a separate top-level file; `vitest.config.ts` is left as a bare `export default defineConfig({})` with a comment pointing at the workspace file. Don't reintroduce alias/include logic into `vitest.config.ts` — it would silently compete with the workspace file. `npx vitest run --project shadcn-radix` (etc.) runs one project in isolation.
- The reason for four projects, not one: each shadcn engine's templates import the same bare specifier (`@/components/ui/select`, etc.) but need it resolved to a *different* fixture tree, and one Vitest resolver can't hold three conflicting alias targets for the same path at once.
- `environment: 'node'` is each project's default; the RTL component tests opt into `jsdom` per file with a `// @vitest-environment jsdom` pragma on line 1.
- `sharedAliases` (in `vitest.workspace.ts`) map `@/lib/utils`, `@/hooks/use-thai-address-index`, and `@/hooks/use-thai-address-cascade` to the real files under `templates/react/ts/`, so template components are tested exactly as authored (import rewriting happens only at scaffold time); each shadcn project additionally maps its own `@/components/ui/*` paths at its own `__fixtures__/<base>/` tree.
- **A new `@/`-aliased template import must now be added in *five* places to stay green**, not three: `tsconfig.templates.json` plus the three per-base `tsconfig.templates.{base,radix,aria}.json` (for `typecheck:templates`, now four `tsc -p` invocations chained with `&&` so the first failure stops the run and names its own config), and `vitest.workspace.ts`'s `sharedAliases` (for tests) — plus `src/utils/rewriteImports.ts` if it's a genuinely new alias *prefix* (not just a new file under an existing `@/lib/*`/`@/hooks/*`/`@/components/ui/*` pattern, which the existing regexes already cover).
- `tests/shared/` holds the engine-independent assertion bodies (`autocompleteBehaviour.tsx`, `cascadeSelectBehaviour.tsx`, `formBehaviour.tsx`, `formFieldBehaviour.tsx`) — props in, hidden inputs out, callback payloads — parameterized by the imported component so each per-engine test file (`*.base.test.tsx`/`*.radix.test.tsx`/`*.aria.test.tsx`) supplies the concrete component plus whatever interaction mechanics genuinely differ by engine (opening a RAC listbox vs. a Base UI/Radix popup), without re-writing the shared assertions three times.
- **Root `tsconfig.json`'s `exclude` lists every RTL test file individually**, because that config's `include` covers `tests` but sets no `jsx` compiler option — a `.tsx` file left off `exclude` fails `npm run typecheck` on JSX syntax it can't parse. Any new `.tsx` test file, or a JSX-bearing helper added under `tests/shared/` (currently excluded as a whole via `tests/shared/**`), must be added to this list or `npm run typecheck` breaks. This bit six separate tasks on the plan that added the `radix`/`aria` engines — it's an easy step to forget because nothing about *writing* the test file fails; only the unrelated `typecheck` script does, later.
- `tests/docs-site.test.ts` is a structure guard over `apps/docs`: every required slug must exist under both `content/docs/<slug>` (Thai, the root locale) and `content/docs/en/<slug>`. Adding a page in one language without its mirror fails `npm test`, as does changing the docs `build` script away from `next build --webpack`.

## CLI entry point

`src/cli.ts` is both the published bin and an importable module (tests import `parseCliArgs`/`isEntryPoint` directly), so `main()` runs only behind the `isEntryPoint()` guard. That guard resolves `process.argv[1]` through `realpathSync` before comparing it to `import.meta.url`, because npm/npx/yarn/pnpm always invoke a package's `bin` through a symlink — a bare `import.meta.url === pathToFileURL(process.argv[1]).href` check silently makes the installed CLI a no-op. CI's "smoke test packaged bin via symlink" step is the regression guard for exactly this.

## Docs site (`apps/docs`)

Fumadocs on Next.js, deployed as its own Vercel project (Root Directory `apps/docs`). It has its own `package.json` and `package-lock.json`, but imports the component templates from `templates/react/ts/` through the `@` alias — their bare imports (`thaizip`, `clsx`, `tailwind-merge`, `@base-ui/react`) resolve by walking up to this repo's root `node_modules`. So a docs build needs `npm ci` at the repo root *and* in `apps/docs` (`apps/docs/vercel.json` overrides the Install Command to do both). Build is `next build --webpack` for Fumadocs MDX compatibility. Content is bilingual: Thai at the root locale, English under `content/docs/en/`.

## Releasing

release-please (`release-please-config.json` + `.release-please-manifest.json`, single package at `.`) drives versioning from Conventional Commits, with `bump-minor-pre-major` while pre-1.0. `package.json`'s `version` and `CHANGELOG.md` are bot-managed — never bump them by hand; land `feat:`/`fix:`/`perf:` commits on `main` and merge the release PR to publish. (`perf:` is part of the `node` release-type's default set — it lands under "Performance Improvements" and bumps a patch, same as `fix:`.)

## Key constants (`src/utils/config.ts`)

- `CORE_PACKAGE_VERSION` — the `thaizip` version range (`>=0.7.5`) that `init` installs into the target project. Keep in sync with the published `thaizip` package.
- `MINIMUM_THAIZIP_VERSION` (`0.7.5`) — the floor `add` enforces against an already-installed `thaizip` before writing components. It covers the cascade/enumeration API and bilingual labels (0.7.0) plus `getDefaultIndexIfLoaded()` (0.7.5), which `hooks/use-thai-address-index.ts` calls to seed its initial state. Raising this floor is not free — it locks existing users out of `add` until they upgrade — so only move it when a template genuinely needs a newer API, and update the `^0.7.x` fixtures in `tests/add.test.ts`, `tests/add.shadcnJsTarget.test.ts`, and `tests/init.test.ts` in the same commit (the gate tests deliberately pin versions *below* the floor and only their asserted message string changes).
- `style` (`'vanilla' | 'shadcn'`) — auto-detected at `init` from `components.json.style`: any recognized style prefix (see `ShadcnBase` below) sets `'shadcn'`; an unrecognized prefix or no `components.json` at all sets `'vanilla'`. No `--style` flag or prompt overrides this — hand-edit the config and re-run `add --overwrite` to change it. `shadcnUiAlias`/`shadcnUiDir` cache the target project's `components.json` `aliases.ui` (import specifier) and its resolved filesystem directory, both `''` when `style === 'vanilla'`.
- `ShadcnBase` (`'base' | 'radix' | 'aria'`) and `SHADCN_BASES` (the same three values as a readonly array, used to validate/iterate) — which of the three shadcn/ui component libraries backs the target project's own `@/components/ui/*` primitives. Stored as `shadcnBase: ShadcnBase | ''` on `thaizip.config.json`, `''` exactly when `style === 'vanilla'`. `detectShadcn` maps `components.json.style`: `base-*` → `'base'`, `radix-*` → `'radix'`, `aria-*` → `'aria'`, the legacy bare `default`/`new-york` → `'radix'`, anything else → unsupported (`style` falls back to `'vanilla'`, `shadcnBase` to `''`). `validateConfig` enforces the pairing is coherent — `style === 'shadcn'` requires a non-empty `shadcnBase`, `style === 'vanilla'` requires `''` — rejecting an incoherent config at read time with the usual "re-run init" error.
- `thaizip.config.json` is now **v4**. `migrateV3Config` backfills `shadcnBase: 'base'` for an existing v3 config that already had `style: 'shadcn'` (v3 could only ever mean Base UI), and `''` for `style: 'vanilla'`; the v1→v2→v3 chain feeds into it unchanged. An existing `radix-*`/`aria-*` project that ran `init` before this migration keeps `style: 'vanilla'` until it re-runs `init` — the migration only touches the *shape* of an existing config, it doesn't re-detect.

## JavaScript scaffold output

All templates are authored in TypeScript (`.tsx`/`.ts` under `templates/react/ts/`) but scaffolded output adapts to the target project's language: `init` auto-detects TypeScript presence via `detectTypeScript` (checking for `tsconfig.json`), and stores the boolean result in `thaizip.config.json`'s `typescript` field. When `add` writes files for a JS-target project (`config.typescript === false`), it runs each file's content through `stripTypes` (via `ts.transpileModule` with `jsx: Preserve`) to remove type annotations, type-only imports, and other TS syntax while preserving JSX and import/export specifiers — then `toJsExtension` renames the destination file (`.tsx` → `.jsx`, `.ts` → `.js`). The rewrite pipeline (`@/lib`/`@/hooks` → relative paths) runs after stripping for component files, so import paths are recomputed for the final `.jsx`/`.js` filenames. TS-target projects skip `stripTypes`/`toJsExtension` and keep `.tsx`/`.ts` filenames; component files still go through the same `@/lib`/`@/hooks` rewrite as JS-target output (see "Template import rewriting" above) — only `lib`/`hook` files are copied byte-for-byte unmodified in TS mode.

## Build details

- `tsup` bundles `src/cli.ts` → `dist/cli.js` as ESM, prepends `#!/usr/bin/env node`
- `dts: false` — no type declarations emitted (it's a CLI, not a library)
- `dist/` and `templates/` are both included in the published npm package
- `@base-ui/react`, `clsx`, `tailwind-merge`, `react`, `react-dom` are `devDependencies` here (needed to author/typecheck/test the templates and this repo's own RTL tests) — they are never bundled into `dist/`. `add` installs them into the *target* project instead, per registry item's own `dependencies` list.
- `radix-ui`, `react-aria-components`, and `cn` join `@base-ui/react` as **authoring-only devDependencies**: needed to typecheck/test the `radix`/`aria` shadcn templates against their vendored fixtures (the fixtures themselves import from `radix-ui`/`react-aria-components`/`cn`), never bundled into `dist/`, and — this is the part that's easy to get wrong — must never appear in a registry item's own `dependencies` list. A user's target project gets Thai-address components that call into *their own already-installed* shadcn/ui primitives; it never needs `radix-ui`, `react-aria-components`, or `cn` installed on our say-so. `tests/registryShadcnConsistency.test.ts` is the regression guard: it asserts no registry item's `shadcn` variant (any base) lists `@base-ui/react`, `radix-ui`, `react-aria-components`, or `cn` in its `dependencies` — the vanilla `dependencies` are exempt from this check since `@base-ui/react` is legitimately there.
- **Fixture-tree drift, deliberate and recorded, not a mistake:** the `base` fixture tree was vendored 2026-09-03 from an older live shadcn registry snapshot and imports `cn` from `@/lib/utils` (this repo's own helper); the `radix` and `aria` trees were vendored 2026-09-05 from `shadcn@4.21.0` and import `cn` from the published **`cn` npm package** instead — the shadcn registry itself changed its own convention between those two dates, independent of any CLI version pinned locally (confirmed live via `curl` against `ui.shadcn.com`'s registry JSON for both `base-nova` and `radix-nova`). All three trees are real, unedited CLI output for the date they were generated; a future regeneration pass should redo all three together so they land back on one convention.
- **Fixture regeneration recipe** (the one that actually worked, after a first attempt using `shadcn view` produced non-compiling un-rewritten registry source — never use `shadcn view` for this): in a scratch temp directory, hand-write a minimal `package.json`, `tsconfig.json`, `app/globals.css`, and `components.json` with `"style": "<base>-nova"` (e.g. `"radix-nova"`), then run
  ```bash
  npx shadcn@latest add button command dialog input input-group label popover select textarea -y
  ```
  and copy the resulting nine `components/ui/*.tsx` files verbatim into `templates/react/ts/shadcn/__fixtures__/<base>/components/ui/`. (The brief's heavier fallback — a real `npx shadcn@latest init -b <base> -d -y` scaffold inside a full `create-next-app` — produces byte-identical primitive output and is only needed if the lightweight probe's `add` fails to pick up the hand-written `components.json`.) Record the exact `shadcn --version` output and the date in the commit/report — the `radix`/`aria` trees are pinned to `4.21.0`, 2026-09-05; regenerate all three together next time to close the drift noted above.
- `typescript` is a runtime `dependency` (not a `devDependency`) because `src/utils/stripTypes.ts` imports it from `src/` to strip TS syntax for JS-target scaffolds — moving it back to `devDependencies` would silently break JS-target `add` in the published CLI while every local check (tests, both typechecks, build, the CI symlink smoke test) still passes, the same class of silent-only-on-publish gotcha as the `isEntryPoint` symlink issue below.
- Tests need Node ≥22.9 (jsdom 30's undici needs `util.markAsUncloneable`) even though `package.json` `engines` says `>=18` — CI pins Node 24; match that locally if `npm test` fails to start.
- `src/cli.ts`'s self-invocation check (`isEntryPoint`) resolves `process.argv[1]` through `realpath` before comparing to `import.meta.url`. This is required, not incidental: npm/npx/yarn/pnpm always invoke a package's `bin` entry through a symlink, and a naive direct comparison silently no-ops the entire CLI (exit 0, no output) — this shipped broken in every published version through 0.3.1, fixed in 0.3.2. `isEntryPoint` is exported/parameterized specifically so `tests/cli.test.ts` can regression-test the symlink case with a real `fs.symlinkSync` fixture; preserve that shape when touching the entry point.
- `.github/workflows/ci.yml` has two jobs on pushes to `main` and all PRs: `verify` (`npm test` + both typechecks + `build`, then a smoke test that runs the built `dist/cli.js` through a real symlink to guard against the bug above regressing silently) and `docs` (installs this repo's `node_modules` *and* `apps/docs`'s, then `npm run build` in `apps/docs` — since the docs site imports `templates/react/ts/**/*` directly, see `apps/docs` root `README.md` section). `release-please.yml` handles releases.

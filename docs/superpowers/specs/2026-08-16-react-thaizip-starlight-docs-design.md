# react-thaizip Starlight documentation site — design spec

Date: 2026-08-16
Status: approved pending written-spec review

## Goal

Build a bilingual, user-facing documentation website for `react-thaizip` by adapting
the existing Astro Starlight documentation project from the sibling `thai-zip`
repository. The site will render the actual scaffold templates as React islands and
deploy as a static site to GitHub Pages at
`https://naay99999.github.io/react-thai-zip/`.

Thai is the primary language at `/`; the English mirror lives under `/en/`.

## Scope

The launch documentation covers the complete consumer journey:

- understand what `react-thaizip` provides;
- satisfy the Tailwind prerequisite;
- run `init` and `add`;
- use both scaffolded components;
- wire controlled state and forms;
- customize text, classes, and design tokens;
- understand CLI/config behavior; and
- recover from common setup and scaffolding failures.

Contributor documentation, registry internals, generated API reference, versioned
documentation, analytics, a custom domain, and server-side features are out of
scope. Core search and enumeration APIs remain documented on the `thai-zip` site;
this site links there instead of duplicating them.

## Decisions

| Topic | Decision |
|---|---|
| Framework | Astro Starlight under `docs/`, with `@astrojs/react` for interactive examples |
| Hosting | GitHub Pages at `https://naay99999.github.io/react-thai-zip/` |
| Locales | Thai root locale, English under `/en/`, with mirrored page structure |
| Demo source | Import canonical files from `templates/react/ts` directly; never copy component implementations into docs |
| Demo format | Scenario-based examples rather than a generic prop-control playground |
| Styling | Tailwind CSS v4 utilities and the CLI's design tokens, without Tailwind Preflight |
| Search | Starlight's built-in static Pagefind search |
| Validation | Astro check/build, template tests/typecheck, link validation, and manual interactive verification |

## Source adaptation

Only the reusable source and configuration from `../thai-zip/docs` will be adapted:

- Astro, Starlight, React, TypeScript, and link-validator setup;
- bilingual content layout and UI translations;
- GitHub Pages build/deploy workflow structure; and
- general demo presentation patterns.

Generated or repository-specific content must not be copied: `node_modules/`,
`dist/`, `.astro/`, the old `superpowers/` artifacts, core API pages, or the core
library demos.

## Project structure

```text
react-thai-zip/
├── .github/workflows/docs.yml
├── docs/
│   ├── package.json
│   ├── package-lock.json
│   ├── astro.config.mjs
│   ├── tsconfig.json
│   ├── src/
│   │   ├── components/demos/
│   │   │   ├── AutocompleteDemo.tsx
│   │   │   ├── CascadeSelectDemo.tsx
│   │   │   ├── FormDemo.tsx
│   │   │   └── demos.css
│   │   ├── content/docs/
│   │   │   ├── ... Thai pages ...
│   │   │   └── en/... English mirror ...
│   │   ├── content/i18n/th.json
│   │   └── styles/component-demo.css
│   └── superpowers/
│       └── specs/...
└── templates/react/ts/
    ├── thai-address-autocomplete.tsx
    ├── thai-address-cascade-select.tsx
    ├── hooks/use-thai-address-index.ts
    └── lib/utils.ts
```

These filenames and boundaries are fixed: MDX owns documentation, demo wrappers
own scenario state/presentation, `demos.css` styles wrapper presentation, the
global `component-demo.css` supplies Tailwind utilities/tokens, and templates own
component behavior.

## Build and module architecture

`astro.config.mjs` sets:

- `site: 'https://naay99999.github.io'`;
- `base: '/react-thai-zip'`;
- Thai as the root locale and English as `en`;
- Starlight sidebar groups matching the sitemap below;
- `@astrojs/react`;
- the Starlight link validator; and
- React/React DOM deduplication through Vite.

The `@` alias resolves to `templates/react/ts`. This preserves the templates'
maintainer-authored imports (`@/lib/utils` and
`@/hooks/use-thai-address-index`) without modifying canonical source. Demo wrappers
use relative imports for their own files so `@` remains unambiguous.

`docs/package.json` is private and declares the complete build/runtime dependency
set required by Astro and the imported templates, including React, React DOM,
`thaizip`, `@base-ui/react`, `clsx`, and `tailwind-merge`.

## Styling architecture

Tailwind CSS v4 scans the canonical files under `templates/react/ts` so every class
shipped by the CLI is present in the docs build. The docs stylesheet imports the
Tailwind theme and utilities layers without global Preflight, preventing Tailwind
from resetting Starlight's document chrome.

The component preview scope exposes the same color and radius variables generated
by `react-thaizip init`. It supports both the consumer-facing `.dark` convention and
Starlight's active dark-theme selector so the unmodified templates look correct in
both site themes. Starlight layout styling and component-preview tokens remain
separate.

Base UI popups render through portals. Their z-index, width, theme variables, and
positioning must work outside the MDX content container without being clipped by
the page, sidebar, or table of contents.

## Sitemap

The Thai and English trees are identical.

| Route | Purpose | Live examples |
|---|---|---|
| `/` | Product value, quick install, component links | Above-the-fold autocomplete |
| `/getting-started/` | Tailwind prerequisite, `init`, `add`, generated files, first import | Basic component |
| `/components/autocomplete/` | Props and usage for `ThaiAddressAutocomplete` | Thai, English, controlled, disabled/invalid |
| `/components/cascade-select/` | Props and usage for `ThaiAddressCascadeSelect` | Thai, English, controlled reset, disabled/invalid |
| `/guides/forms/` | Hidden inputs, submit payload, required/validation, blur and refs | Interactive form |
| `/guides/customization/` | Text overrides, class slots, tokens, Tailwind v3/v4 | Focused styled examples where useful |
| `/reference/cli/` | Commands, flags, selection, overwrite, help and version behavior | None |
| `/reference/config/` | `thaizip.config.json`, directory/package-manager detection, import rewriting | None |
| `/troubleshooting/` | Tailwind, core version, installs, existing files and import paths | None |

The navigation also exposes an external Core API link to the `thai-zip`
documentation.

## Demo components

### `AutocompleteDemo`

Imports `ThaiAddressAutocomplete` from the canonical template. Its scenario props
select Thai or English labels, controlled or uncontrolled state, disabled/invalid
presentation, and whether to show the latest `onValueChange` result. The wrapper
does not implement search or consume core search APIs.

### `CascadeSelectDemo`

Imports `ThaiAddressCascadeSelect` from the canonical template. It demonstrates
the normal cascade, English labels, controlled state, parent-change invalidation,
and disabled/invalid presentation. The output panel makes null resets and completed
addresses visible without changing component behavior.

### `FormDemo`

Uses the real component `name` prop in a browser-only form. On submit it displays
the four hidden values (`subdistrict`, `district`, `province`, and `zipcode`) and
does not transmit data. It also documents required/invalid behavior, blur handling,
and ref wiring.

MDX pages pass only scenario configuration to these wrappers. The landing-page
example uses `client:load`; examples elsewhere use `client:visible` so JavaScript
is deferred until needed. Code snippets show consumer import paths after
scaffolding, not the docs' internal template paths.

## Data flow and state ownership

```text
MDX scenario props
       │
       ▼
Demo wrapper state ─────► localized output/event panel
       │
       ▼
Canonical template component
       │
       ▼
useThaiAddressIndex ────► loadDefaultIndex module cache
       │
       ▼
Base UI interaction and onValueChange/form values
```

Wrappers own only controlled values, submitted form data, and example output.
Templates own index loading, query/cascade behavior, selection, hidden inputs, and
component error states. Multiple islands share `loadDefaultIndex()`'s module cache
after the data chunk loads. No application server, API route, persistence, or
outbound form submission is required.

## Loading and error behavior

- The template's real loading UI remains visible until the index is ready.
- The template's real error and retry behavior handles index-load failures.
- Wrappers never replace or duplicate component loading/search/cascade logic.
- Output panels distinguish an absent value from a completed selection.
- Scenario descriptions and states are localized and do not rely on color alone.
- A failed demo must remain an understandable error example rather than a blank
  island.

## Accessibility

Interactive acceptance checks cover keyboard navigation, focus and blur behavior,
clear/reset controls, labels, required/invalid semantics, and Base UI portal
content. Demo output uses readable text or formatted JSON with an accessible label.
Disabled and invalid examples include explanatory text rather than depending only
on visual styling.

## CI and GitHub Pages deployment

`.github/workflows/docs.yml` runs for pull requests and pushes that touch docs,
templates, relevant package manifests/locks, or the workflow itself. It also
supports `workflow_dispatch`. Per-ref concurrency cancels obsolete runs.

The build job performs:

1. root `npm ci`;
2. root component tests and `typecheck:templates`;
3. root CLI build;
4. `npm ci` in `docs/`;
5. `npm run check` in `docs/`;
6. `npm run build` in `docs/`; and
7. Starlight link validation as part of the docs build.

Pull requests stop after validation. A successful push to `main` uploads
`docs/dist` with `actions/upload-pages-artifact` and deploys it with
`actions/deploy-pages`. The workflow receives only the `contents: read`,
`pages: write`, and `id-token: write` permissions required by its jobs.

Repository Settings must be configured once with Pages source set to GitHub
Actions.

## Verification and acceptance criteria

Before completion:

- root tests, template typecheck, CLI build, Astro check, and Astro build pass;
- link validation passes for both locale trees;
- no `node_modules`, `dist`, or `.astro` output is tracked;
- both `/react-thai-zip/` and `/react-thai-zip/en/` resolve with working assets,
  navigation, search, sitemap, and internal links;
- autocomplete and cascade examples work by mouse and keyboard;
- Thai/English labels, controlled null resets, disabled/invalid examples, and form
  payload output match the documented contracts;
- light and dark themes keep component triggers, popups, options, and output panels
  readable; and
- existing CLI packaging and release behavior remain unchanged.

Demo wrappers do not receive a second unit-test stack. Canonical component behavior
is covered by the repository's existing Vitest/RTL tests; Astro check/build covers
wrapper imports and types. The interactive scenarios receive a focused manual
browser pass before handoff.

## Release hygiene

Documentation work uses `docs:` commits so release automation does not infer a new
CLI feature release. `docs/package.json` remains private. Existing user files and
unrelated worktree changes are not staged or modified.

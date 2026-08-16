# react-thaizip Starlight Documentation Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a bilingual Astro Starlight site that documents `react-thaizip` and renders its canonical React templates as interactive examples.

**Architecture:** A private Astro project lives under `docs/` and imports component source directly from `templates/react/ts` through the existing `@` convention. MDX owns documentation, three focused React wrappers own example state/output, the templates own all address behavior, and a path-filtered GitHub Actions workflow validates pull requests and deploys `docs/dist` from `main`.

**Tech Stack:** Astro 5, Starlight, React 19, TypeScript, Tailwind CSS 4 utilities without Preflight, Base UI, Vitest structural tests, Pagefind, GitHub Actions, GitHub Pages

**Spec:** `docs/superpowers/specs/2026-08-16-react-thaizip-starlight-docs-design.md`

## Global Constraints

- Production URL is exactly `https://naay99999.github.io/react-thai-zip/`; Astro `site` is `https://naay99999.github.io` and `base` is `/react-thai-zip`.
- Thai is the root locale and English is the mirrored `/en/` locale.
- Import `ThaiAddressAutocomplete` and `ThaiAddressCascadeSelect` from `templates/react/ts`; never copy their implementations into `docs/src`.
- Keep template imports `@/lib/utils` and `@/hooks/use-thai-address-index` unchanged by resolving `@` to `templates/react/ts`.
- Use Tailwind CSS v4 theme/utilities without global Preflight, and scan `templates/react/ts` explicitly.
- Demos are scenario-based React islands. They may own controlled values and display output, but they must not reimplement search, index loading, or cascade logic.
- Core API reference remains on `https://naay99999.github.io/thai-zip/` and is linked rather than duplicated.
- `docs/package.json` must be private. Do not track `docs/node_modules`, `docs/dist`, or `docs/.astro`.
- Preserve unrelated worktree content, including the existing untracked `.claude/` directory.
- Use `docs:` commit messages so release automation does not infer a CLI feature release.

---

## File map

### Site foundation

- Create `docs/package.json`: private Astro package and scripts.
- Generate `docs/package-lock.json`: reproducible docs dependencies.
- Create `docs/astro.config.mjs`: Starlight locales/sidebar, GitHub Pages base, React, Tailwind, aliases, and link validation.
- Create `docs/tsconfig.json`: Astro strict TypeScript plus `@/*` template paths.
- Create `docs/src/content.config.ts`: Starlight docs and i18n collections.
- Create `docs/src/content/i18n/th.json`: Thai Starlight chrome strings.
- Create `docs/src/styles/component-demo.css`: Tailwind utility generation and component design tokens.
- Modify `.gitignore`: ignore generated docs directories.

### Demo layer

- Create `docs/src/components/demos/demo-shared.tsx`: locale type, localized output panel, and demo frame.
- Create `docs/src/components/demos/AutocompleteDemo.tsx`: scenario wrapper for the canonical autocomplete.
- Create `docs/src/components/demos/CascadeSelectDemo.tsx`: scenario wrapper for the canonical cascade.
- Create `docs/src/components/demos/FormDemo.tsx`: browser-only form payload example.
- Create `docs/src/components/demos/demos.css`: wrapper/output presentation using Starlight variables.

### Bilingual content

- Create Thai pages under `docs/src/content/docs/`.
- Create the exact English mirror under `docs/src/content/docs/en/`.
- Create `tests/docs-site.test.ts`: structural regression checks for config, canonical imports, and locale parity; this uses the existing root Vitest stack and does not test component behavior again.

### Delivery

- Create `.github/workflows/docs.yml`: docs validation and GitHub Pages deployment.
- Modify `README.md`: add the documentation URL near the introduction.

---

### Task 1: Establish a buildable Astro/Starlight foundation

**Files:**
- Create: `tests/docs-site.test.ts`
- Create: `docs/package.json`
- Create: `docs/package-lock.json`
- Create: `docs/astro.config.mjs`
- Create: `docs/tsconfig.json`
- Create: `docs/src/content.config.ts`
- Create: `docs/src/content/i18n/th.json`
- Create: `docs/src/styles/component-demo.css`
- Create: `docs/src/content/docs/index.mdx`
- Create: `docs/src/content/docs/en/index.mdx`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: canonical templates at `templates/react/ts` and root dependency floors from `package.json`.
- Produces: an Astro project with `dev`, `check`, `build`, and `preview` scripts; Vite alias `@`; Thai/English routes; Tailwind utilities/tokens available to all later demos.

- [ ] **Step 1: Write the failing foundation test**

Create `tests/docs-site.test.ts`:

```ts
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()

async function read(relativePath: string): Promise<string> {
  return readFile(path.join(root, relativePath), 'utf8')
}

describe('documentation site structure', () => {
  it('has a private Astro package with the required scripts', async () => {
    const manifest = JSON.parse(await read('docs/package.json')) as {
      private?: boolean
      scripts?: Record<string, string>
    }

    expect(manifest.private).toBe(true)
    expect(manifest.scripts).toMatchObject({
      dev: 'astro dev',
      check: 'astro check',
      build: 'astro build',
      preview: 'astro preview',
    })
  })

  it('targets the GitHub Pages project URL and canonical template directory', async () => {
    const config = await read('docs/astro.config.mjs')
    expect(config).toContain("site: 'https://naay99999.github.io'")
    expect(config).toContain("base: '/react-thai-zip'")
    expect(config).toContain("new URL('../templates/react/ts', import.meta.url)")
    expect(config).toContain("'@': templatesDir")
  })

  it('does not track generated Astro directories', async () => {
    const ignore = await read('.gitignore')
    expect(ignore).toContain('docs/node_modules/')
    expect(ignore).toContain('docs/dist/')
    expect(ignore).toContain('docs/.astro/')
  })

  it('does not contain copied component implementations', async () => {
    const entries = await readdir(path.join(root, 'docs/src'), { recursive: true })
    expect(entries.some((entry) => entry.endsWith('thai-address-autocomplete.tsx'))).toBe(false)
    expect(entries.some((entry) => entry.endsWith('thai-address-cascade-select.tsx'))).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test and verify the missing docs project fails**

Run: `npx vitest run tests/docs-site.test.ts`

Expected: FAIL with `ENOENT` for `docs/package.json`.

- [ ] **Step 3: Create the docs manifest**

Create `docs/package.json` with this exact dependency boundary:

```json
{
  "name": "react-thaizip-docs",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "check": "astro check",
    "build": "astro build",
    "preview": "astro preview"
  },
  "dependencies": {
    "@astrojs/react": "^4.2.0",
    "@astrojs/starlight": "^0.36.0",
    "@base-ui/react": "^1.7.0",
    "@tailwindcss/vite": "^4.1.11",
    "astro": "^5.6.0",
    "clsx": "^2.1.1",
    "react": "^19.2.8",
    "react-dom": "^19.2.8",
    "starlight-links-validator": "^0.18.0",
    "tailwind-merge": "^3.6.0",
    "tailwindcss": "^4.1.11",
    "thaizip": "^0.7.2"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.4",
    "@types/react": "^19.2.4",
    "@types/react-dom": "^19.2.3",
    "typescript": "^5.7.2"
  }
}
```

Run `npm --prefix docs install --no-audit --no-fund` to generate
`docs/package-lock.json`. Do not copy the sibling repository's dirty lockfile.

- [ ] **Step 4: Create Astro, TypeScript, and collection configuration**

Create `docs/astro.config.mjs`:

```js
// @ts-check
import { fileURLToPath } from 'node:url'
import react from '@astrojs/react'
import starlight from '@astrojs/starlight'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'
import starlightLinksValidator from 'starlight-links-validator'

const templatesDir = fileURLToPath(new URL('../templates/react/ts', import.meta.url))

export default defineConfig({
  site: 'https://naay99999.github.io',
  base: '/react-thai-zip',
  integrations: [
    starlight({
      title: 'react-thaizip',
      description: 'Ready-to-use Thai address components for React and Next.js',
      defaultLocale: 'root',
      locales: {
        root: { label: 'ไทย', lang: 'th' },
        en: { label: 'English', lang: 'en' },
      },
      customCss: ['./src/styles/component-demo.css'],
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/naay99999/react-thai-zip' },
      ],
      plugins: [starlightLinksValidator({ errorOnRelativeLinks: false })],
      sidebar: [
        {
          label: 'เริ่มต้น',
          translations: { en: 'Start Here' },
          items: [{ slug: 'getting-started' }],
        },
        {
          label: 'คอมโพเนนต์',
          translations: { en: 'Components' },
          items: [
            { slug: 'components/autocomplete' },
            { slug: 'components/cascade-select' },
          ],
        },
        {
          label: 'คู่มือ',
          translations: { en: 'Guides' },
          items: [{ slug: 'guides/forms' }, { slug: 'guides/customization' }],
        },
        {
          label: 'อ้างอิง',
          translations: { en: 'Reference' },
          items: [
            { slug: 'reference/cli' },
            { slug: 'reference/config' },
            { slug: 'troubleshooting' },
            { label: 'Core API', link: 'https://naay99999.github.io/thai-zip/' },
          ],
        },
      ],
    }),
    react(),
  ],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: { '@': templatesDir },
      dedupe: ['react', 'react-dom'],
    },
  },
})
```

Create `docs/tsconfig.json`:

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "src/**/*", "../templates/react/ts/**/*"],
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "baseUrl": ".",
    "paths": { "@/*": ["../templates/react/ts/*"] }
  }
}
```

Create `docs/src/content.config.ts`:

```ts
import { defineCollection } from 'astro:content'
import { docsLoader, i18nLoader } from '@astrojs/starlight/loaders'
import { docsSchema, i18nSchema } from '@astrojs/starlight/schema'

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
  i18n: defineCollection({ loader: i18nLoader(), schema: i18nSchema() }),
}
```

Copy the Thai UI translation keys from `../thai-zip/docs/src/content/i18n/th.json` verbatim into `docs/src/content/i18n/th.json`; these strings belong to Starlight chrome, not core-library content.

- [ ] **Step 5: Create Tailwind utilities and tokens without Preflight**

Create `docs/src/styles/component-demo.css`:

```css
@layer theme, base, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);
@source "../../../templates/react/ts";

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

:root[data-theme='dark'],
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
```

- [ ] **Step 6: Add minimal real landing content and ignore generated output**

Create Thai and English `index.mdx` files with final frontmatter and a short product statement; Task 3 expands them without changing routes:

```mdx
---
title: react-thaizip
description: เพิ่มคอมโพเนนต์ที่อยู่ไทยพร้อมใช้ให้โปรเจกต์ React และ Next.js
template: splash
hero:
  tagline: Scaffold คอมโพเนนต์ autocomplete และ cascade ที่คุณเป็นเจ้าของโค้ดเอง
  actions:
    - text: เริ่มต้นใช้งาน
      link: /react-thai-zip/getting-started/
      icon: right-arrow
      variant: primary
---
```

```mdx
---
title: react-thaizip
description: Add ready-to-use Thai address components to React and Next.js projects
template: splash
hero:
  tagline: Scaffold autocomplete and cascade components whose source code you own
  actions:
    - text: Get started
      link: /react-thai-zip/en/getting-started/
      icon: right-arrow
      variant: primary
---
```

Append these exact entries to `.gitignore`:

```gitignore
docs/node_modules/
docs/dist/
docs/.astro/
```

- [ ] **Step 7: Install, typecheck, and build the foundation**

Run:

```bash
npx vitest run tests/docs-site.test.ts
npm --prefix docs run check
npm --prefix docs run build
```

Expected: all commands PASS; the Astro build emits Thai `/` and English `/en/` routes under the configured base.

- [ ] **Step 8: Commit the foundation**

```bash
git add .gitignore tests/docs-site.test.ts docs/package.json docs/package-lock.json docs/astro.config.mjs docs/tsconfig.json docs/src
git commit -m "docs: scaffold Starlight documentation site"
```

---

### Task 2: Add canonical-template React demo wrappers

**Files:**
- Modify: `tests/docs-site.test.ts`
- Create: `docs/src/components/demos/demo-shared.tsx`
- Create: `docs/src/components/demos/AutocompleteDemo.tsx`
- Create: `docs/src/components/demos/CascadeSelectDemo.tsx`
- Create: `docs/src/components/demos/FormDemo.tsx`
- Create: `docs/src/components/demos/demos.css`

**Interfaces:**
- Consumes: `ThaiAddressAutocomplete`, `ThaiAddressCascadeSelect`, and `ResolvedThaiAddress` from the canonical template/core packages.
- Produces: `AutocompleteDemo(props)`, `CascadeSelectDemo(props)`, and `FormDemo(props)` React components embeddable from MDX with `client:*` directives.

- [ ] **Step 1: Extend the structural test to require canonical imports**

Add this test inside `describe('documentation site structure', ...)`:

```ts
it('demo wrappers import canonical templates through the template alias', async () => {
  const autocomplete = await read('docs/src/components/demos/AutocompleteDemo.tsx')
  const cascade = await read('docs/src/components/demos/CascadeSelectDemo.tsx')
  const form = await read('docs/src/components/demos/FormDemo.tsx')

  expect(autocomplete).toContain("from '@/thai-address-autocomplete'")
  expect(cascade).toContain("from '@/thai-address-cascade-select'")
  expect(form).toMatch(/from '@\/thai-address-(autocomplete|cascade-select)'/)
})
```

- [ ] **Step 2: Run the test and verify missing wrappers fail**

Run: `npx vitest run tests/docs-site.test.ts`

Expected: FAIL with `ENOENT` for `AutocompleteDemo.tsx`.

- [ ] **Step 3: Create the shared demo frame and output contract**

Create `demo-shared.tsx` with these exported interfaces and behavior:

```tsx
import type { ReactNode } from 'react'
import type { ResolvedThaiAddress } from 'thaizip'
import './demos.css'

export type DemoLocale = 'th' | 'en'

export type DemoFrameProps = {
  title: string
  description: string
  children: ReactNode
}

export function DemoFrame({ title, description, children }: DemoFrameProps) {
  return (
    <section className="tz-demo" aria-label={title}>
      <div className="tz-demo-copy">
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      {children}
    </section>
  )
}

export function DemoOutput({
  label,
  value,
}: {
  label: string
  value: ResolvedThaiAddress | Record<string, FormDataEntryValue> | null
}) {
  return (
    <div className="tz-demo-output" aria-live="polite">
      <strong>{label}</strong>
      <pre>{value === null ? 'null' : JSON.stringify(value, null, 2)}</pre>
    </div>
  )
}
```

- [ ] **Step 4: Implement `AutocompleteDemo`**

Use this public prop contract:

```tsx
export type AutocompleteDemoProps = {
  locale?: DemoLocale
  mode?: 'uncontrolled' | 'controlled'
  disabled?: boolean
  invalid?: boolean
  showOutput?: boolean
}
```

Implementation requirements:

```tsx
const [value, setValue] = useState<ResolvedThaiAddress | null>(null)
const controlledProps = mode === 'controlled' ? { value } : {}

<ThaiAddressAutocomplete
  {...controlledProps}
  locale={locale}
  disabled={disabled}
  aria-invalid={invalid || undefined}
  onValueChange={setValue}
/>
```

Wrap it in `DemoFrame`; localize title, description, output label, and controlled clear button for Thai/English. Render `DemoOutput` when `showOutput` is true. The clear button calls `setValue(null)` and appears only in controlled mode. Do not call `loadDefaultIndex`, `searchThaiAddress`, or `useThaiAddressAutocomplete` in this wrapper.

- [ ] **Step 5: Implement `CascadeSelectDemo`**

Use this public prop contract:

```tsx
export type CascadeSelectDemoProps = {
  locale?: DemoLocale
  mode?: 'uncontrolled' | 'controlled'
  disabled?: boolean
  invalid?: boolean
  showOutput?: boolean
}
```

Mirror the autocomplete wrapper's controlled-prop pattern around
`ThaiAddressCascadeSelect`. The localized output must make `null` visible so a user
can observe the callback after changing a parent of a completed selection. The
controlled clear button sets `value` to null; no wrapper function may enumerate
provinces, districts, or subdistricts.

- [ ] **Step 6: Implement `FormDemo`**

Use this public prop contract:

```tsx
export type FormDemoProps = {
  locale?: DemoLocale
  component?: 'autocomplete' | 'cascade-select'
}
```

The submit handler is browser-only and exact:

```tsx
function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault()
  const data = Object.fromEntries(new FormData(event.currentTarget).entries())
  setPayload(data)
}
```

Track focus/blur wiring without sharing incompatible ref types:

```tsx
const autocompleteRef = useRef<HTMLInputElement>(null)
const cascadeRef = useRef<HTMLButtonElement>(null)
const [blurCount, setBlurCount] = useState(0)
const focusControl = () => {
  if (component === 'autocomplete') autocompleteRef.current?.focus()
  else cascadeRef.current?.focus()
}
```

Render the selected canonical component with `name="address"`, `required`,
`onBlur={() => setBlurCount((count) => count + 1)}`,
`onValueChange={setValue}`, and its correctly typed ref. Render localized focus and
submit buttons, `DemoOutput` for the submitted record, the blur count, and a short
localized status line for the current resolved value. Do not send a request or use
an action URL.

- [ ] **Step 7: Add demo presentation CSS**

Create `demos.css` with these stable selectors:

```css
.tz-demo {
  margin-block: 1.5rem;
  padding: 1rem;
  border: 1px solid var(--sl-color-gray-5);
  border-radius: 0.75rem;
  background: var(--sl-color-bg-nav);
}
.tz-demo-copy { margin-bottom: 1rem; }
.tz-demo-copy p { margin: 0.25rem 0 0; color: var(--sl-color-gray-3); }
.tz-demo-actions { display: flex; gap: 0.5rem; margin-top: 0.75rem; }
.tz-demo-action {
  border: 1px solid var(--sl-color-gray-4);
  border-radius: 0.375rem;
  padding: 0.4rem 0.75rem;
  background: var(--sl-color-bg);
  color: var(--sl-color-text);
  cursor: pointer;
}
.tz-demo-output {
  margin-top: 1rem;
  padding: 0.75rem;
  border: 1px solid var(--sl-color-gray-5);
  border-radius: 0.5rem;
  background: var(--sl-color-bg);
}
.tz-demo-output pre {
  max-height: 18rem;
  margin: 0.5rem 0 0;
  overflow: auto;
  font-size: var(--sl-text-xs);
}
```

- [ ] **Step 8: Verify wrapper types and canonical-source integrity**

Run:

```bash
npx vitest run tests/docs-site.test.ts
npm --prefix docs run check
npm --prefix docs run build
```

Expected: PASS. No `thai-address-*.tsx` implementation exists below `docs/src`.

- [ ] **Step 9: Commit the demo layer**

```bash
git add tests/docs-site.test.ts docs/src/components/demos
git commit -m "docs: add canonical component demos"
```

---

### Task 3: Write the bilingual landing and getting-started journey

**Files:**
- Modify: `tests/docs-site.test.ts`
- Modify: `docs/src/content/docs/index.mdx`
- Modify: `docs/src/content/docs/en/index.mdx`
- Create: `docs/src/content/docs/getting-started.mdx`
- Create: `docs/src/content/docs/en/getting-started.mdx`

**Interfaces:**
- Consumes: `AutocompleteDemo` and the public CLI behavior documented by `README.md`, `src/cli.ts`, `src/commands/init.ts`, and `src/commands/add.ts`.
- Produces: complete first-visit and first-component paths in both locales.

- [ ] **Step 1: Add a failing locale-route parity test**

Add these helpers and the initial required route set to `tests/docs-site.test.ts`:

```ts
const requiredDocSlugs = ['index.mdx', 'getting-started.mdx']

it('keeps required Thai and English pages mirrored', async () => {
  for (const slug of requiredDocSlugs) {
    await expect(read(`docs/src/content/docs/${slug}`)).resolves.toBeTruthy()
    await expect(read(`docs/src/content/docs/en/${slug}`)).resolves.toBeTruthy()
  }
})
```

- [ ] **Step 2: Run the test and verify getting-started is missing**

Run: `npx vitest run tests/docs-site.test.ts`

Expected: FAIL with `ENOENT` for `docs/src/content/docs/getting-started.mdx`.

- [ ] **Step 3: Expand both landing pages**

Each page must import its locale-configured demo and hydrate it immediately:

```mdx
import AutocompleteDemo from '../../components/demos/AutocompleteDemo'

<AutocompleteDemo client:load locale="th" />
```

```mdx
import AutocompleteDemo from '../../../components/demos/AutocompleteDemo'

<AutocompleteDemo client:load locale="en" />
```

Below the hero, write three concise sections in each locale:

1. live component heading and explanation that this is the canonical scaffold;
2. a two-command quick start using `npx react-thaizip init` and
   `npx react-thaizip add autocomplete cascade-select`; and
3. links to both component pages and the `thai-zip` Core API site.

- [ ] **Step 4: Write both getting-started pages**

Use matching section order in Thai and English:

1. prerequisites: Node >=18 and existing Tailwind v3/v4;
2. run `npx react-thaizip init`;
3. explain `thaizip.config.json` and inserted design tokens;
4. run `npx react-thaizip add autocomplete`;
5. show the generated component, hook, and `lib/utils.ts` file tree;
6. show a first import; and
7. link to cascade and form guides.

The first-use snippet is exact:

```tsx
import { ThaiAddressAutocomplete } from './components/thai-address-autocomplete'

export function AddressField() {
  return <ThaiAddressAutocomplete onValueChange={(address) => console.log(address)} />
}
```

State explicitly that `react-thaizip` is a scaffold CLI, not a runtime component
package, and that users own the generated source.

- [ ] **Step 5: Verify routes, links, and build**

Run:

```bash
npx vitest run tests/docs-site.test.ts
npm --prefix docs run check
npm --prefix docs run build
```

Expected: PASS; build output includes root, `/en/`, `/getting-started/`, and `/en/getting-started/`.

- [ ] **Step 6: Commit the onboarding content**

```bash
git add tests/docs-site.test.ts docs/src/content/docs/index.mdx docs/src/content/docs/en/index.mdx docs/src/content/docs/getting-started.mdx docs/src/content/docs/en/getting-started.mdx
git commit -m "docs: add bilingual getting-started journey"
```

---

### Task 4: Document both address components with scenario examples

**Files:**
- Modify: `tests/docs-site.test.ts`
- Create: `docs/src/content/docs/components/autocomplete.mdx`
- Create: `docs/src/content/docs/components/cascade-select.mdx`
- Create: `docs/src/content/docs/en/components/autocomplete.mdx`
- Create: `docs/src/content/docs/en/components/cascade-select.mdx`

**Interfaces:**
- Consumes: demo wrappers from Task 2 and prop contracts from both canonical templates.
- Produces: consumer reference and live scenarios for every public component prop group.

- [ ] **Step 1: Extend the required mirrored route set**

Append these strings to `requiredDocSlugs`:

```ts
'components/autocomplete.mdx',
'components/cascade-select.mdx',
```

- [ ] **Step 2: Run the test and verify component pages are missing**

Run: `npx vitest run tests/docs-site.test.ts`

Expected: FAIL for the first missing component page.

- [ ] **Step 3: Write Thai and English autocomplete pages**

Both pages must use the same section order:

1. install command `npx react-thaizip add autocomplete`;
2. basic import and usage;
3. basic Thai demo;
4. English locale demo;
5. controlled demo with visible output and clear button;
6. disabled and `aria-invalid` examples;
7. complete prop table grouped into value, search, field, text, class slots, and ref;
8. links to forms and customization.

Import the wrapper with the locale-appropriate path:

```mdx
// Thai: docs/src/content/docs/components/autocomplete.mdx
import AutocompleteDemo from '../../../components/demos/AutocompleteDemo'

// English: docs/src/content/docs/en/components/autocomplete.mdx
import AutocompleteDemo from '../../../../components/demos/AutocompleteDemo'
```

Embed scenarios with exact prop combinations:

```mdx
<AutocompleteDemo client:visible locale="th" />
<AutocompleteDemo client:visible locale="en" />
<AutocompleteDemo client:visible locale="th" mode="controlled" showOutput />
<AutocompleteDemo client:visible locale="th" disabled />
<AutocompleteDemo client:visible locale="th" invalid />
```

Document that `value` uses `ResolvedThaiAddress | null`, `defaultValue` seeds
uncontrolled state, typing empty text clears a resolved selection, and
`limit`/`debounce`/`threshold` pass to the core hook.

- [ ] **Step 4: Write Thai and English cascade pages**

Use matching sections for install, basic usage, Thai/English demos, controlled
output, parent reset, disabled/invalid states, full prop table, and related guides.

Import `CascadeSelectDemo` from `../../../components/demos/CascadeSelectDemo` in
the Thai page and `../../../../components/demos/CascadeSelectDemo` in the English
page.

Embed:

```mdx
<CascadeSelectDemo client:visible locale="th" />
<CascadeSelectDemo client:visible locale="en" />
<CascadeSelectDemo client:visible locale="th" mode="controlled" showOutput />
<CascadeSelectDemo client:visible locale="th" disabled />
<CascadeSelectDemo client:visible locale="th" invalid />
```

State precisely that changing a parent after a completed selection emits
`onValueChange(null)` and clears downstream selections. Explain that the forwarded
ref and `onBlur` target the province trigger.

- [ ] **Step 5: Verify prop names against canonical source**

Run:

```bash
rg -n "type ThaiAddress.*Props" templates/react/ts/thai-address-*.tsx
npm --prefix docs run check
npm --prefix docs run build
npx vitest run tests/docs-site.test.ts
```

Expected: every prop table name exists in the corresponding template and every command passes.

- [ ] **Step 6: Commit component documentation**

```bash
git add tests/docs-site.test.ts docs/src/content/docs/components docs/src/content/docs/en/components
git commit -m "docs: document address components"
```

---

### Task 5: Add form integration and customization guides

**Files:**
- Modify: `tests/docs-site.test.ts`
- Create: `docs/src/content/docs/guides/forms.mdx`
- Create: `docs/src/content/docs/guides/customization.mdx`
- Create: `docs/src/content/docs/en/guides/forms.mdx`
- Create: `docs/src/content/docs/en/guides/customization.mdx`

**Interfaces:**
- Consumes: `FormDemo`, template `name` semantics, class slots, text types, and token generation from `src/utils/tokens.ts`.
- Produces: framework-neutral browser form guidance and Tailwind v3/v4 customization guidance.

- [ ] **Step 1: Extend and fail the mirrored-route test**

Append:

```ts
'guides/forms.mdx',
'guides/customization.mdx',
```

Run: `npx vitest run tests/docs-site.test.ts`

Expected: FAIL for `guides/forms.mdx`.

- [ ] **Step 2: Write the bilingual forms guide**

Both locales cover:

- `name="address"` producing `address-subdistrict`, `address-district`,
  `address-province`, and `address-zipcode`;
- hidden inputs disabled when the component is disabled;
- `required`, `aria-invalid`, `onBlur`, and forwarded refs;
- controlled state for form libraries; and
- native `FormData` submission without a server.

Import `FormDemo` from `../../../components/demos/FormDemo` in the Thai page and
`../../../../components/demos/FormDemo` in the English page.

Embed both form variants:

```mdx
<FormDemo client:visible locale="th" component="autocomplete" />
<FormDemo client:visible locale="th" component="cascade-select" />
```

Use `locale="en"` in the English mirror. Include the exact hidden-field payload
shape and do not claim that `react-thaizip` sends or stores data.

- [ ] **Step 3: Write the bilingual customization guide**

Use matching sections:

1. locale and partial `texts` override;
2. autocomplete class slots;
3. cascade class slots;
4. tokens inserted by `init`;
5. Tailwind v4 automatic `@theme inline` behavior;
6. Tailwind v3 manual `theme.extend` step; and
7. advice to edit the scaffolded source for deeper customization.

Include this representative text override:

```tsx
<ThaiAddressAutocomplete
  locale="en"
  texts={{
    placeholder: 'Search delivery address',
    emptyText: 'No delivery area found',
  }}
/>
```

Copy token examples from `buildTokenBlock` and `buildV3ConfigSnippet` in
`src/utils/tokens.ts`; do not invent token names.

- [ ] **Step 4: Verify guide content and links**

Run:

```bash
npx vitest run tests/docs-site.test.ts
npm --prefix docs run check
npm --prefix docs run build
```

Expected: PASS with no broken links or invalid MDX imports.

- [ ] **Step 5: Commit the guides**

```bash
git add tests/docs-site.test.ts docs/src/content/docs/guides docs/src/content/docs/en/guides
git commit -m "docs: add forms and customization guides"
```

---

### Task 6: Add CLI/config reference and troubleshooting

**Files:**
- Modify: `tests/docs-site.test.ts`
- Create: `docs/src/content/docs/reference/cli.mdx`
- Create: `docs/src/content/docs/reference/config.mdx`
- Create: `docs/src/content/docs/troubleshooting.mdx`
- Create: `docs/src/content/docs/en/reference/cli.mdx`
- Create: `docs/src/content/docs/en/reference/config.mdx`
- Create: `docs/src/content/docs/en/troubleshooting.mdx`

**Interfaces:**
- Consumes: behavior from `src/cli.ts`, `src/commands/init.ts`, `src/commands/add.ts`, `src/utils/config.ts`, detection utilities, and README.
- Produces: complete user-facing operational reference without contributor internals.

- [ ] **Step 1: Complete the required locale route list and fail it**

Append:

```ts
'reference/cli.mdx',
'reference/config.mdx',
'troubleshooting.mdx',
```

Run: `npx vitest run tests/docs-site.test.ts`

Expected: FAIL for `reference/cli.mdx`.

- [ ] **Step 2: Write both CLI reference pages**

Document exact syntax and precedence:

```text
react-thaizip init [--yes]
react-thaizip add [component...] [--yes] [--overwrite]
react-thaizip --help
react-thaizip --version
react-thaizip init --help
react-thaizip add --help
```

Cover `--yes`/`-y`, `--overwrite`, `--help`/`-h`, `--version`/`-v`, multiple targets,
interactive multiselect, public component aliases, help winning over version, and
internal registry items not appearing in selection/help.

- [ ] **Step 3: Write both config reference pages**

Document the v2 `thaizip.config.json` fields from `src/utils/config.ts`, including
`componentDir`, `libDir`, `hooksDir`, `packageManager`, and Tailwind metadata.
Explain project structure detection exactly:

| Condition | Component directory |
|---|---|
| `app/` exists | `app/components/` |
| `pages/` exists | `components/` |
| Neither exists | `src/components/` |

Explain that component imports authored as `@/lib/*` and `@/hooks/*` are rewritten
to relative paths at scaffold time, while existing hook/lib files are not
overwritten.

- [ ] **Step 4: Write both troubleshooting pages**

Use problem → cause → exact recovery sections for:

- Tailwind not detected: install/configure Tailwind, then rerun `init`;
- no global CSS found: copy the printed tokens into the real global stylesheet;
- Tailwind v3 styles missing: add the printed `theme.extend` snippet;
- `thaizip` below `0.7.0`: run `npm i thaizip@latest`, then rerun `add`;
- dependency installation failure: install the printed package list manually;
- existing component: choose overwrite or use `--overwrite` intentionally;
- existing hook/lib: explain intentional non-overwrite behavior;
- unexpected import paths: inspect `thaizip.config.json` directories and rerun in
  the project root; and
- no config: rerun `init` or accept the `add` command's init prompt.

- [ ] **Step 5: Verify every operational claim against source**

Run:

```bash
npx vitest run tests/docs-site.test.ts
npm run typecheck:templates
npm --prefix docs run check
npm --prefix docs run build
```

Expected: PASS; both locale trees contain all nine required slugs.

- [ ] **Step 6: Commit reference and troubleshooting**

```bash
git add tests/docs-site.test.ts docs/src/content/docs/reference docs/src/content/docs/en/reference docs/src/content/docs/troubleshooting.mdx docs/src/content/docs/en/troubleshooting.mdx
git commit -m "docs: add CLI reference and troubleshooting"
```

---

### Task 7: Add GitHub Pages validation/deployment and README entry point

**Files:**
- Create: `.github/workflows/docs.yml`
- Modify: `README.md`

**Interfaces:**
- Consumes: root and docs lockfiles/scripts plus the completed static site.
- Produces: PR build checks, `main` deployment to GitHub Pages, and a discoverable production link.

- [ ] **Step 1: Create the workflow with path filters and least privilege**

Create `.github/workflows/docs.yml`:

```yaml
name: Docs

on:
  push:
    branches: [main]
    paths:
      - 'docs/**'
      - 'templates/**'
      - 'src/**'
      - 'package.json'
      - 'package-lock.json'
      - '.github/workflows/docs.yml'
  pull_request:
    paths:
      - 'docs/**'
      - 'templates/**'
      - 'src/**'
      - 'package.json'
      - 'package-lock.json'
      - '.github/workflows/docs.yml'
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: docs-${{ github.ref }}
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
          cache-dependency-path: |
            package-lock.json
            docs/package-lock.json
      - name: Install root dependencies
        run: npm ci
      - name: Verify canonical components
        run: |
          npm test
          npm run typecheck:templates
          npm run build
      - name: Install docs dependencies
        working-directory: docs
        run: npm ci
      - name: Check and build docs
        working-directory: docs
        run: |
          npm run check
          npm run build
      - uses: actions/upload-pages-artifact@v3
        if: github.event_name != 'pull_request'
        with:
          path: docs/dist

  deploy:
    if: github.event_name != 'pull_request'
    needs: build
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Add the production docs link to README**

Immediately below the opening description, add:

```md
📚 [Documentation and live component demos](https://naay99999.github.io/react-thai-zip/)
```

- [ ] **Step 3: Validate workflow syntax and full local build sequence**

Run:

```bash
npm test
npm run typecheck
npm run typecheck:templates
npm run build
npm --prefix docs ci
npm --prefix docs run check
npm --prefix docs run build
```

Expected: every command exits 0. `docs/dist/index.html`, `docs/dist/en/index.html`,
and `docs/dist/sitemap-index.xml` exist.

- [ ] **Step 4: Confirm generated output stays untracked**

Run: `git status --short`

Expected: `docs/dist`, `docs/.astro`, and `docs/node_modules` do not appear.

- [ ] **Step 5: Commit delivery configuration**

```bash
git add .github/workflows/docs.yml README.md
git commit -m "docs: deploy documentation to GitHub Pages"
```

---

### Task 8: Run final acceptance and polish the site

**Files:**
- Modify only files implicated by acceptance failures.

**Interfaces:**
- Consumes: the completed docs project and GitHub Pages workflow.
- Produces: verified static artifacts and a manual deployment-setting handoff.

- [ ] **Step 1: Run the complete automated verification suite from a clean dependency state**

Run:

```bash
npm ci
npm test
npm run typecheck
npm run typecheck:templates
npm run build
npm --prefix docs ci
npm --prefix docs run check
npm --prefix docs run build
```

Expected: every command exits 0 with no TypeScript, MDX, or link-validator errors.

- [ ] **Step 2: Serve the production build under the configured base**

Run from `docs/`: `npm run preview -- --host 127.0.0.1`

Open the preview URL with `/react-thai-zip/` and verify both
`/react-thai-zip/` and `/react-thai-zip/en/` return rendered pages with working
assets, navigation, Pagefind search, and language switching.

- [ ] **Step 3: Execute the interactive acceptance matrix**

For both Thai and English component pages, verify:

- autocomplete opens above the page chrome, supports arrow keys/Enter/Escape,
  selects an address, displays output, and clears controlled state;
- cascade province → district → subdistrict completes a value, changing a parent
  clears downstream state and displays `null`, and keyboard selection works;
- disabled controls cannot open;
- invalid controls expose `aria-invalid` and remain visually distinguishable;
- form examples display exactly four `address-*` entries after submit;
- Starlight light and dark themes keep triggers, portals, items, JSON, and focus
  indicators readable; and
- no horizontal page overflow appears at mobile width.

- [ ] **Step 4: Inspect static base-path output**

Run:

```bash
rg -n "/react-thai-zip/" docs/dist/index.html docs/dist/en/index.html docs/dist/sitemap-0.xml
git status --short
```

Expected: built links/assets use `/react-thai-zip/`; only intentional source
changes appear in Git, and `.claude/` remains untouched/untracked.

- [ ] **Step 5: Fix and re-run only if acceptance found a concrete defect**

For each defect, add or tighten the closest structural test when the failure is
machine-checkable, apply the smallest source fix, then rerun the command that
failed plus the full docs check/build. Do not change canonical component behavior
from the docs task; report a template defect separately if the failure originates
in `templates/react/ts`.

- [ ] **Step 6: Commit any acceptance fix through its owning task**

If Step 5 changes source, return to the task that owns that file, repeat that
task's verification and explicit staging list, and use commit message
`docs: polish documentation site`. If no source changes, do not create an empty
commit.

- [ ] **Step 7: Record the one-time repository setting in the handoff**

Tell the repository owner to open **Settings → Pages → Build and deployment →
Source**, select **GitHub Actions**, then run the Docs workflow or merge the branch
to `main`. Do not claim the public URL is live until the Pages deployment job has
completed successfully.

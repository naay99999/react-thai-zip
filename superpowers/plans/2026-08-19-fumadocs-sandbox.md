# Fumadocs Migration + Sandbox Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Starlight docs site under `apps/docs` with a bilingual (th/en) Fumadocs site deployed on Vercel, and add a tracked sandbox generator (`npm run sandbox`) that scaffolds a gitignored Next.js playground pinned to the docs stack for exercising the real CLI.

**Architecture:** Isolated apps (no npm workspaces): the root CLI package keeps its own lockfile/build/release untouched (only a `sandbox` script is added); `apps/docs` becomes a Fumadocs (Next.js App Router) app with Thai as root locale (`hideLocale: 'default-locale'`) and English under `/en/`, importing the canonical templates from `templates/react/ts` through the `@` alias; `apps/sandbox` is generated on demand by `scripts/sandbox.mjs`, which reads dependency versions from `apps/docs/package.json`.

**Tech Stack:** Next.js 16, fumadocs-ui/fumadocs-core 16.x + fumadocs-mdx 15.x, Tailwind CSS v4 (`@tailwindcss/postcss`), React 19, TypeScript.

**Spec:** `superpowers/specs/2026-08-19-fumadocs-sandbox-design.md`

## Global Constraints

- Node.js >= 22 for `apps/docs` (Fumadocs requirement). The root CLI package stays Node 18+ and its build/test/release config is untouched.
- Exact dependency ranges in `apps/docs/package.json`: `fumadocs-ui ^16.14.5`, `fumadocs-core ^16.14.5`, `fumadocs-mdx ^15.3.0`, `next ^16.3.1`, `react ^19.2.8`, `react-dom ^19.2.8`, `tailwindcss ^4.3.3`, `@tailwindcss/postcss ^4.3.3`, `@base-ui/react ^1.7.0`, `clsx ^2.1.1`, `tailwind-merge ^3.6.0`, `thaizip ^0.7.2`, `@types/mdx ^2.0.13`, `typescript ^5.7.2`.
- `apps/docs/package.json` stays `private: true` with its own `package-lock.json`. No npm workspaces at the repo root.
- `apps/docs/tsconfig.json` must map `"@/*": ["../../templates/react/ts/*"]` (canonical template alias) and `"~/*": ["./*"]` (app-internal alias).
- Never copy `thai-address-autocomplete.tsx` / `thai-address-cascade-select.tsx` implementations into `apps/docs` — demos always import them through `@/thai-address-*`.
- The CSS rule `.tz-demo [aria-invalid='true'] { border-color: var(--destructive); }` must survive the migration verbatim (structure tests assert it).
- The sandbox generator never invokes the CLI itself; it only scaffolds the app and prints next steps.
- `apps/sandbox/` stays gitignored in the root `.gitignore`.
- Commit style: conventional commits (`chore:`, `docs:`, `feat:`, `test:`), matching `git log --oneline`.
- All paths below are relative to the repo root unless stated otherwise. macOS/BSD `sed -i ''` syntax is used; work inside the stated directory.

---

### Task 1: Port demo components and design tokens out of `src/`

**Files:**
- Move: `apps/docs/src/components/demos/*` → `apps/docs/components/demos/*`
- Move: `apps/docs/src/styles/component-demo.css` → `apps/docs/styles/component-demo.css`
- Modify: `apps/docs/components/demos/AutocompleteDemo.tsx`, `CascadeSelectDemo.tsx`, `FormDemo.tsx` (add `'use client'`)
- Modify: `apps/docs/components/demos/demos.css` (replace Starlight variables)
- Modify: `apps/docs/styles/component-demo.css` (drop duplicate Tailwind entry imports)

**Interfaces:**
- Consumes: existing demo wrappers unchanged (props: `locale`, `mode`, `disabled`, `invalid`, `showOutput`).
- Produces: `apps/docs/components/demos/AutocompleteDemo.tsx` (default + named export), `CascadeSelectDemo.tsx`, `FormDemo.tsx`, `demo-shared.tsx` (`DemoFrame`, `DemoOutput`, `DemoLocale`), `demos.css`, and `styles/component-demo.css` — at the locations every later task imports from.

- [ ] **Step 1: Move the demo directory and design tokens file**

```bash
mkdir -p apps/docs/components apps/docs/styles
git mv apps/docs/src/components/demos apps/docs/components/demos
git mv apps/docs/src/styles/component-demo.css apps/docs/styles/component-demo.css
```

- [ ] **Step 2: Add the React client directive to the three demo wrappers**

Add `'use client'` as line 1 of each file (before the imports):

- `apps/docs/components/demos/AutocompleteDemo.tsx`
- `apps/docs/components/demos/CascadeSelectDemo.tsx`
- `apps/docs/components/demos/FormDemo.tsx`

(Next.js MDX output is server-side; the demos use `useState` so they must be client components. `demo-shared.tsx` needs no directive — it is only imported from client files.)

- [ ] **Step 3: Rewrite `demos.css` against Fumadocs variables**

Replace the entire contents of `apps/docs/components/demos/demos.css` with:

```css
.tz-demo {
  margin-block: 1.5rem;
  padding: 1rem;
  border: 1px solid var(--color-fd-border);
  border-radius: 0.75rem;
  background: var(--color-fd-card);
}
.tz-demo-copy { margin-bottom: 1rem; }
.tz-demo-copy p { margin: 0.25rem 0 0; color: var(--color-fd-muted-foreground); }
.tz-demo-actions { display: flex; gap: 0.5rem; margin-top: 0.75rem; }
.tz-demo-action {
  border: 1px solid var(--color-fd-border);
  border-radius: 0.375rem;
  padding: 0.4rem 0.75rem;
  background: var(--color-fd-background);
  color: var(--color-fd-foreground);
  cursor: pointer;
}
.tz-demo [aria-invalid='true'] {
  border-color: var(--destructive);
}
.tz-demo-output {
  margin-top: 1rem;
  padding: 0.75rem;
  border: 1px solid var(--color-fd-border);
  border-radius: 0.5rem;
  background: var(--color-fd-background);
}
.tz-demo-output pre {
  max-height: 18rem;
  margin: 0.5rem 0 0;
  overflow: auto;
  font-size: 0.75rem;
}
```

The `.tz-demo [aria-invalid='true']` rule is kept byte-for-byte — structure tests assert it, and `--destructive` is defined by the design tokens from Task 2's `component-demo.css`.

- [ ] **Step 4: Strip the standalone Tailwind entry from `component-demo.css`**

In `apps/docs/styles/component-demo.css`, delete these three lines at the top (the Fumadocs `global.css` will own the single Tailwind entry; this file keeps only the `@source` directive, the `@theme inline` mapping, and the light/dark token blocks):

```css
@layer theme, base, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);
```

Keep `@source "../../../templates/react/ts";` unchanged — from `apps/docs/styles/`, `../../../` resolves to the repo root, which is correct (the old path from `src/styles/` was a no-op that Vite's module-graph detection silently covered; under Next.js the `@source` directive is now load-bearing).

- [ ] **Step 5: Verify the port mechanically**

```bash
grep -rn 'sl-' apps/docs/components/demos/demos.css; echo "exit: $?"
```

Expected: no matches (`exit: 1`), and:

```bash
grep -n "aria-invalid" apps/docs/components/demos/demos.css
```

Expected output includes `border-color: var(--destructive);`.

- [ ] **Step 6: Commit**

```bash
git add apps/docs/components apps/docs/styles apps/docs/src
git commit -m "chore(docs): port demos and design tokens out of src for Fumadocs"
```

---

### Task 2: Replace the Starlight app with the Fumadocs shell

**Files:**
- Delete: `apps/docs/astro.config.mjs`, `apps/docs/src/content.config.ts`, `apps/docs/src/content/i18n/th.json`, `apps/docs/package-lock.json`, generated `node_modules/`, `.astro/`, `dist/`
- Move: `apps/docs/src/content/docs` → `apps/docs/content/docs`
- Create: `apps/docs/package.json`, `apps/docs/next.config.mjs`, `apps/docs/postcss.config.mjs`, `apps/docs/tsconfig.json`, `apps/docs/proxy.ts`, `apps/docs/lib/i18n.ts`, `apps/docs/lib/source.ts`, `apps/docs/lib/layout.shared.tsx`, `apps/docs/components/mdx.tsx`, `apps/docs/app/global.css`, `apps/docs/app/[lang]/layout.tsx`, `apps/docs/app/[lang]/docs/layout.tsx`, `apps/docs/app/[lang]/docs/[[...slug]]/page.tsx`, `apps/docs/app/api/search/route.ts`
- Modify: `apps/docs/content/docs/index.mdx`, `apps/docs/content/docs/en/index.mdx` (drop splash frontmatter), all `*.mdx` (drop `client:load`), `.gitignore`

**Interfaces:**
- Consumes: `apps/docs/components/demos/*` and `apps/docs/styles/component-demo.css` from Task 1.
- Produces: a buildable Fumadocs app exporting `source` (from `~/lib/source`), `i18n` (from `~/lib/i18n`), `baseOptions`/`translations` (from `~/lib/layout.shared`), and `getMDXComponents` (from `~/components/mdx`) — the exact names Tasks 3–5 import.

- [ ] **Step 1: Move content and delete the Starlight app**

```bash
mkdir -p apps/docs/content
git mv apps/docs/src/content/docs apps/docs/content/docs
git rm apps/docs/astro.config.mjs apps/docs/src/content.config.ts apps/docs/src/content/i18n/th.json
git rm apps/docs/package-lock.json 2>/dev/null || true
rm -rf apps/docs/node_modules apps/docs/.astro apps/docs/dist apps/docs/src
```

- [ ] **Step 2: Write `apps/docs/package.json`**

```json
{
  "name": "react-thaizip-docs",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "@base-ui/react": "^1.7.0",
    "clsx": "^2.1.1",
    "fumadocs-core": "^16.14.5",
    "fumadocs-mdx": "^15.3.0",
    "fumadocs-ui": "^16.14.5",
    "next": "^16.3.1",
    "react": "^19.2.8",
    "react-dom": "^19.2.8",
    "tailwind-merge": "^3.6.0",
    "thaizip": "^0.7.2"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.3.3",
    "@types/mdx": "^2.0.13",
    "@types/node": "^22.10.5",
    "@types/react": "^19.2.4",
    "@types/react-dom": "^19.2.3",
    "tailwindcss": "^4.3.3",
    "typescript": "^5.7.2"
  },
  "engines": {
    "node": ">=22"
  }
}
```

- [ ] **Step 3: Write `apps/docs/next.config.mjs`, `apps/docs/postcss.config.mjs`, `apps/docs/tsconfig.json`**

`apps/docs/next.config.mjs`:

```js
import { createMDX } from 'fumadocs-mdx/next';

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
};

const withMDX = createMDX();

export default withMDX(config);
```

`apps/docs/postcss.config.mjs`:

```js
const config = {
  plugins: { '@tailwindcss/postcss': {} },
};

export default config;
```

`apps/docs/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["../../templates/react/ts/*"],
      "~/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Write the i18n + source modules**

`apps/docs/lib/i18n.ts`:

```ts
import { defineI18n } from 'fumadocs-core/i18n';

export const i18n = defineI18n({
  defaultLanguage: 'th',
  languages: ['th', 'en'],
  hideLocale: 'default-locale',
});
```

Thai pages serve at `/docs/...` (no prefix); English at `/en/docs/...`.

`apps/docs/lib/source.ts`:

```ts
import { defineDocs } from 'fumadocs-mdx/macro';
import { loader } from 'fumadocs-core/source';
import { i18n } from './i18n';

const docs = defineDocs({
  dir: 'content/docs',
});

export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
  i18n,
});
```

`apps/docs/lib/layout.shared.tsx`:

```tsx
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { uiTranslations } from 'fumadocs-ui/i18n';
import { i18n } from './i18n';

export const translations = i18n
  .translations()
  .extend(uiTranslations())
  .add({
    th: {
      displayName: 'ไทย',
      'Search(search trigger)': 'ค้นหาเอกสาร',
    },
    en: {
      displayName: 'English',
    },
  });

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: 'react-thaizip',
    },
    githubUrl: 'https://github.com/naay99999/react-thai-zip',
  };
}
```

- [ ] **Step 5: Write `apps/docs/components/mdx.tsx`**

```tsx
import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
```

- [ ] **Step 6: Write the middleware `apps/docs/proxy.ts`**

```ts
import { createI18nMiddleware } from 'fumadocs-core/i18n/middleware';
import { i18n } from '~/lib/i18n';

export default createI18nMiddleware(i18n);

export const config = {
  matcher: ['/((?!api|_next|favicon.ico|favicon.svg).*)'],
};
```

- [ ] **Step 7: Write the app routes**

`apps/docs/app/global.css`:

```css
@import 'tailwindcss';
@import 'fumadocs-ui/css/neutral.css';
@import 'fumadocs-ui/css/preset.css';
@import '../styles/component-demo.css';
```

`apps/docs/app/[lang]/layout.tsx`:

```tsx
import type { ReactNode } from 'react';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { i18nProvider } from 'fumadocs-ui/i18n';
import { translations } from '~/lib/layout.shared';
import './global.css';

export default async function RootLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  return (
    <html lang={lang} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <RootProvider i18n={i18nProvider(translations, lang)}>{children}</RootProvider>
      </body>
    </html>
  );
}
```

`apps/docs/app/[lang]/docs/layout.tsx`:

```tsx
import type { ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { source } from '~/lib/source';
import { baseOptions } from '~/lib/layout.shared';

export default async function Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  return (
    <DocsLayout tree={source.getPageTree(lang)} {...baseOptions()}>
      {children}
    </DocsLayout>
  );
}
```

`apps/docs/app/[lang]/docs/[[...slug]]/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import { source } from '~/lib/source';
import { getMDXComponents } from '~/components/mdx';

export default async function Page({
  params,
}: {
  params: Promise<{ lang: string; slug?: string[] }>;
}) {
  const { slug, lang } = await params;
  const page = source.getPage(slug, lang);
  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug?: string[] }>;
}): Promise<Metadata> {
  const { slug, lang } = await params;
  const page = source.getPage(slug, lang);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
  };
}
```

`apps/docs/app/api/search/route.ts`:

```ts
import { source } from '~/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

export const { GET } = createFromSource(source);
```

(No `language` option: content is mixed Thai/English, so the default tokenizer is used.)

- [ ] **Step 8: Make the content Fumadocs-compatible**

Drop the Starlight splash frontmatter from `apps/docs/content/docs/index.mdx` — replace its frontmatter block with:

```mdx
---
title: react-thaizip
description: เพิ่มคอมโพเนนต์ที่อยู่ไทยพร้อมใช้ให้โปรเจกต์ React และ Next.js
---
```

And from `apps/docs/content/docs/en/index.mdx`:

```mdx
---
title: react-thaizip
description: Ready-to-use Thai address components for React and Next.js projects
---
```

(The `hero` moves to the home page in Task 3.) Then strip the Astro hydration directive from every MDX file:

```bash
cd apps/docs/content/docs
grep -rl 'client:load' . --include='*.mdx' | xargs sed -i '' 's/ client:load//g'
cd ../../../..
```

- [ ] **Step 9: Update `.gitignore`**

Replace the `apps/docs` block:

```gitignore
apps/docs/node_modules/
apps/docs/.next/
apps/docs/.source/
apps/sandbox/
```

(Removes `apps/docs/dist/` and `apps/docs/.astro/`; adds `.next/` and the fumadocs-mdx generated `.source/`.)

- [ ] **Step 10: Install and build**

```bash
cd apps/docs
npm install
npm run build
```

Expected: install succeeds; `next build` compiles and type-checks (the demos, templates via `@`, and all MDX pages), generating the nine Thai + nine English routes. If the build reports unknown-frontmatter errors on any MDX file, move that file's Starlight-only frontmatter keys out the same way as Step 8 — only `title`/`description`/`full`/`icon` are valid.

- [ ] **Step 11: Commit**

```bash
git add apps/docs .gitignore
git commit -m "feat(docs): replace Starlight with Fumadocs app shell"
```

---

### Task 3: Sidebar navigation, link rewrites, and the landing page

**Files:**
- Create: `apps/docs/content/docs/meta.json`, `apps/docs/content/docs/en/meta.json`, `apps/docs/app/[lang]/(home)/page.tsx`
- Modify: every `apps/docs/content/docs/**/*.mdx` internal link

**Interfaces:**
- Consumes: `baseOptions` from `~/lib/layout.shared`, `AutocompleteDemo` from `~/components/demos/AutocompleteDemo`.
- Produces: final URL scheme — Thai `/docs/<slug>`, English `/en/docs/<slug>`, landing at `/` and `/en/`.

- [ ] **Step 1: Write the sidebar meta files**

`apps/docs/content/docs/meta.json`:

```json
{
  "pages": [
    "index",
    "getting-started",
    "---คอมโพเนนต์---",
    "components/autocomplete",
    "components/cascade-select",
    "---คู่มือ---",
    "guides/forms",
    "guides/customization",
    "---อ้างอิง---",
    "reference/cli",
    "reference/config",
    "troubleshooting",
    { "title": "Core API", "url": "https://naay99999.github.io/thai-zip/", "external": true }
  ]
}
```

`apps/docs/content/docs/en/meta.json`:

```json
{
  "pages": [
    "index",
    "getting-started",
    "---Components---",
    "components/autocomplete",
    "components/cascade-select",
    "---Guides---",
    "guides/forms",
    "guides/customization",
    "---Reference---",
    "reference/cli",
    "reference/config",
    "troubleshooting",
    { "title": "Core API", "url": "https://naay99999.github.io/thai-zip/", "external": true }
  ]
}
```

- [ ] **Step 2: Rewrite internal links from the GitHub Pages base to `/docs`**

```bash
cd apps/docs/content/docs
grep -rl '](/react-thai-zip/' . --include='*.mdx' | xargs sed -i '' \
  -e 's|](/react-thai-zip/en/|](/en/docs/|g' \
  -e 's|](/react-thai-zip/|](/docs/|g' \
  -e 's|](/docs/\([^)]*\))/|](/docs/\1)|g' \
  -e 's|](/en/docs/\([^)]*\))/|](/en/docs/\1)|g' \
  -e 's|](/docs/\([^)]*\)/#|](/docs/\1#|g' \
  -e 's|](/en/docs/\([^)]*\)/#|](/en/docs/\1#|g'
cd ../../../..
```

Verify no stale base-prefixed links remain:

```bash
grep -rn '](/react-thai-zip' apps/docs/content/docs --include='*.mdx'; echo "exit: $?"
```

Expected: no matches (`exit: 1`). External `https://` links (including the repo URL) are untouched.

- [ ] **Step 3: Write the landing page `apps/docs/app/[lang]/(home)/page.tsx`**

```tsx
import Link from 'next/link';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '~/lib/layout.shared';
import AutocompleteDemo from '~/components/demos/AutocompleteDemo';

const copy = {
  th: {
    tagline: 'Scaffold คอมโพเนนต์ autocomplete และ cascade ที่คุณเป็นเจ้าของโค้ดเอง',
    description: 'เพิ่มคอมโพเนนต์ที่อยู่ไทยพร้อมใช้ให้โปรเจกต์ React และ Next.js',
    cta: 'เริ่มต้นใช้งาน',
    tryTitle: 'ลองคอมโพเนนต์จริง',
    tryBody:
      'ตัวอย่างนี้คือ ThaiAddressAutocomplete จาก scaffold มาตรฐานของ react-thaizip ไม่ใช่สำเนาที่เขียนขึ้นสำหรับเว็บเอกสาร เมื่อเพิ่มลงโปรเจกต์แล้ว คุณเป็นเจ้าของซอร์สโค้ดและปรับแต่งได้เต็มที่',
  },
  en: {
    tagline: 'Scaffold autocomplete and cascade components whose code you own',
    description: 'Ready-to-use Thai address components for React and Next.js projects',
    cta: 'Get Started',
    tryTitle: 'Try the real component',
    tryBody:
      'This example is the ThaiAddressAutocomplete from the standard react-thaizip scaffold, not a copy written for this site. Once added to your project, you own the source and can customize it freely.',
  },
} as const;

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const c = copy[lang === 'en' ? 'en' : 'th'];
  const docsHref = lang === 'en' ? '/en/docs/getting-started' : '/docs/getting-started';

  return (
    <HomeLayout {...baseOptions()}>
      <section className="container flex flex-col items-center gap-4 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight">react-thaizip</h1>
        <p className="max-w-xl text-lg text-fd-muted-foreground">{c.tagline}</p>
        <Link
          href={docsHref}
          className="rounded-lg bg-fd-primary px-5 py-2.5 font-medium text-fd-primary-foreground"
        >
          {c.cta}
        </Link>
      </section>
      <section className="container max-w-3xl pb-20">
        <h2 className="mb-4 text-xl font-semibold">{c.tryTitle}</h2>
        <p className="mb-4 text-sm text-fd-muted-foreground">{c.tryBody}</p>
        <AutocompleteDemo locale={lang === 'en' ? 'en' : 'th'} />
      </section>
    </HomeLayout>
  );
}
```

- [ ] **Step 4: Build and verify routes**

```bash
cd apps/docs
npm run build
npm run start &
sleep 5
curl -s -o /dev/null -w '%{http_code} /docs/getting-started\n' http://localhost:3000/docs/getting-started
curl -s -o /dev/null -w '%{http_code} /en/docs/getting-started\n' http://localhost:3000/en/docs/getting-started
curl -s -o /dev/null -w '%{http_code} /\n' http://localhost:3000/
curl -s http://localhost:3000/docs/getting-started | grep -o 'เริ่มต้นใช้งาน' | head -1
kill %1
```

Expected: three `200` status lines and the Thai page title string printed. The `/` request confirms the middleware rewrites the default locale to the home page.

- [ ] **Step 5: Commit**

```bash
git add apps/docs
git commit -m "feat(docs): add sidebar navigation, /docs links, and landing page"
```

---

### Task 4: Sandbox generator script

**Files:**
- Create: `scripts/sandbox.mjs`
- Modify: `package.json` (root — add the `sandbox` script only)

**Interfaces:**
- Consumes: dependency ranges from `apps/docs/package.json` (`next`, `react`, `react-dom`, `tailwindcss`, `@tailwindcss/postcss`).
- Produces: `npm run sandbox` → regenerates `apps/sandbox` (gitignored) as a minimal Next.js App Router app whose `app/global.css` contains `@import "tailwindcss";` so the CLI's Tailwind v4 detection succeeds; supports `--force` to skip the wipe prompt; never invokes the CLI.

- [ ] **Step 1: Write `scripts/sandbox.mjs`**

```js
#!/usr/bin/env node
import { execSync } from 'node:child_process'
import { access, constants, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import readline from 'node:readline/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sandboxDir = path.join(root, 'apps/sandbox')
const force = process.argv.includes('--force')

const docsPkg = JSON.parse(await readFile(path.join(root, 'apps/docs/package.json'), 'utf8'))
const pick = (name) => docsPkg.dependencies?.[name] ?? docsPkg.devDependencies?.[name]
const versions = {}
for (const name of ['next', 'react', 'react-dom', 'tailwindcss', '@tailwindcss/postcss']) {
  const range = pick(name)
  if (!range) throw new Error(`apps/docs/package.json is missing ${name}`)
  versions[name] = range
}

async function exists(p) {
  try {
    await access(p, constants.F_OK)
    return true
  } catch {
    return false
  }
}

if (await exists(sandboxDir)) {
  if (!force) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    const answer = await rl.question('apps/sandbox already exists. Wipe and regenerate? [y/N] ')
    rl.close()
    if (!/^(y|yes)$/i.test(answer.trim())) {
      console.log('Aborted.')
      process.exit(0)
    }
  }
  await rm(sandboxDir, { recursive: true, force: true })
}

await mkdir(path.join(sandboxDir, 'app'), { recursive: true })

const pkg = {
  name: 'react-thaizip-sandbox',
  private: true,
  scripts: {
    dev: 'next dev',
    build: 'next build',
    start: 'next start',
  },
  dependencies: {
    next: versions.next,
    react: versions.react,
    'react-dom': versions['react-dom'],
  },
  devDependencies: {
    '@tailwindcss/postcss': versions['@tailwindcss/postcss'],
    tailwindcss: versions.tailwindcss,
  },
}

const files = {
  'package.json': `${JSON.stringify(pkg, null, 2)}\n`,
  'next.config.mjs': `/** @type {import('next').NextConfig} */\nconst config = { reactStrictMode: true };\nexport default config;\n`,
  'postcss.config.mjs': `const config = {\n  plugins: { '@tailwindcss/postcss': {} },\n};\nexport default config;\n`,
  'tsconfig.json': `${JSON.stringify(
    {
      compilerOptions: {
        target: 'ESNext',
        lib: ['dom', 'dom.iterable', 'esnext'],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: 'esnext',
        moduleResolution: 'bundler',
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: 'preserve',
        incremental: true,
        plugins: [{ name: 'next' }],
      },
      include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
      exclude: ['node_modules'],
    },
    null,
    2,
  )}\n`,
  '.gitignore': 'node_modules/\n.next/\nout/\n',
  'app/layout.tsx': `import type { ReactNode } from 'react'
import './global.css'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  )
}
`,
  'app/page.tsx': `export default function Page() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold">react-thaizip sandbox</h1>
      <p className="mt-2 text-sm opacity-70">
        Run the CLI, then import the scaffolded components here to test them.
      </p>
    </main>
  )
}
`,
  'app/global.css': `@import "tailwindcss";
`,
}

for (const [file, content] of Object.entries(files)) {
  await writeFile(path.join(sandboxDir, file), content)
}

console.log(`Sandbox created at apps/sandbox (next ${versions.next}).`)
console.log('Installing dependencies...')
execSync('npm install', { cwd: sandboxDir, stdio: 'inherit' })

console.log(`
Next steps — exercise the CLI end to end:

  1. npm run build                      # repo root — builds dist/cli.js
  2. cd apps/sandbox
  3. node ../../dist/cli.js init --yes
  4. node ../../dist/cli.js add autocomplete cascade-select --yes
  5. npm run dev                        # http://localhost:3000

apps/sandbox is gitignored — wipe and regenerate any time with \`npm run sandbox\`.
`)
```

- [ ] **Step 2: Add the root script**

In the root `package.json`, add to `"scripts"` (after `"typecheck:templates"`):

```json
"sandbox": "node scripts/sandbox.mjs"
```

Nothing else in the root manifest changes.

- [ ] **Step 3: Run the generator**

```bash
npm run sandbox
```

Expected: prompt-free creation (directory is empty), `npm install` succeeds, next-steps message printed. Confirm the result:

```bash
ls apps/sandbox
cat apps/sandbox/app/global.css
```

Expected: `app/`, `package.json`, `tsconfig.json`, `next.config.mjs`, `postcss.config.mjs`, `.gitignore`, `node_modules/`; the CSS file contains `@import "tailwindcss";`.

- [ ] **Step 4: Exercise the CLI end to end**

```bash
npm run build
cd apps/sandbox
node ../../dist/cli.js init --yes
node ../../dist/cli.js add autocomplete cascade-select --yes
npm run build
```

Expected: `init` detects Tailwind v4 and npm, writes `thaizip.config.json` and tokens; `add` writes the components plus `lib`/`hooks` helpers under `app/components/`; the sandbox's own `next build` compiles the scaffolded output (Next type-checks every `**/*.tsx` under the tsconfig include, imported or not).

- [ ] **Step 5: Confirm the sandbox stays untracked and commit**

```bash
git status --short | grep sandbox; echo "exit: $?"
```

Expected: no matches (`exit: 1` — `apps/sandbox/` is gitignored).

```bash
git add scripts/sandbox.mjs package.json
git commit -m "feat: add npm run sandbox generator for CLI testing"
```

---

### Task 5: Rewrite the docs-site structure tests

**Files:**
- Modify: `tests/docs-site.test.ts` (full rewrite)

**Interfaces:**
- Consumes: the final layout produced by Tasks 1–4.
- Produces: `npm test` guards that `ci.yml` runs — no docs build workflow is reintroduced.

- [ ] **Step 1: Replace `tests/docs-site.test.ts`**

```ts
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const docsDir = 'apps/docs'
const requiredDocSlugs = [
  'index.mdx',
  'getting-started.mdx',
  'components/autocomplete.mdx',
  'components/cascade-select.mdx',
  'guides/forms.mdx',
  'guides/customization.mdx',
  'reference/cli.mdx',
  'reference/config.mdx',
  'troubleshooting.mdx',
]

async function read(relativePath: string): Promise<string> {
  return readFile(path.join(root, relativePath), 'utf8')
}

describe('documentation site structure', () => {
  it('keeps required Thai and English pages mirrored', async () => {
    for (const slug of requiredDocSlugs) {
      await expect(read(`${docsDir}/content/docs/${slug}`)).resolves.toBeTruthy()
      await expect(read(`${docsDir}/content/docs/en/${slug}`)).resolves.toBeTruthy()
    }
  })

  it('has a private Next.js package with the required scripts', async () => {
    const manifest = JSON.parse(await read(`${docsDir}/package.json`)) as {
      private?: boolean
      scripts?: Record<string, string>
    }

    expect(manifest.private).toBe(true)
    expect(manifest.scripts).toMatchObject({
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
    })
  })

  it('maps the template alias to the canonical templates directory', async () => {
    const config = await read(`${docsDir}/tsconfig.json`)

    expect(config).toContain('"@/*": ["../../templates/react/ts/*"]')
  })

  it('does not track generated directories or the sandbox', async () => {
    const ignore = await read('.gitignore')

    expect(ignore).toContain('apps/docs/node_modules/')
    expect(ignore).toContain('apps/docs/.next/')
    expect(ignore).toContain('apps/docs/.source/')
    expect(ignore).toContain('apps/sandbox/')
  })

  it('does not contain copied component implementations', async () => {
    for (const dir of ['components', 'app', 'content', 'lib']) {
      const entries = await readdir(path.join(root, docsDir, dir), { recursive: true }).catch(
        () => [],
      )

      expect(entries.some((entry) => entry.endsWith('thai-address-autocomplete.tsx'))).toBe(false)
      expect(entries.some((entry) => entry.endsWith('thai-address-cascade-select.tsx'))).toBe(false)
    }
  })

  it('demo wrappers are client components importing canonical templates through the alias', async () => {
    const autocomplete = await read(`${docsDir}/components/demos/AutocompleteDemo.tsx`)
    const cascade = await read(`${docsDir}/components/demos/CascadeSelectDemo.tsx`)
    const form = await read(`${docsDir}/components/demos/FormDemo.tsx`)

    expect(autocomplete).toContain("'use client'")
    expect(cascade).toContain("'use client'")
    expect(form).toContain("'use client'")
    expect(autocomplete).toContain("from '@/thai-address-autocomplete'")
    expect(cascade).toContain("from '@/thai-address-cascade-select'")
    expect(cascade).toContain('export default CascadeSelectDemo')
    expect(form).toMatch(/from '@\/thai-address-(autocomplete|cascade-select)'/)
    expect(form).toContain('export default FormDemo')
  })

  it('form demo presents the localized current resolved address', async () => {
    const form = await read(`${docsDir}/components/demos/FormDemo.tsx`)

    expect(form).toContain('value.subdistrict')
    expect(form).toContain('value.subdistrictEn')
    expect(form).toContain('value.zipCode')
  })

  it('visually distinguishes invalid demo controls', async () => {
    const css = await read(`${docsDir}/components/demos/demos.css`)

    expect(css).toMatch(
      /\.tz-demo \[aria-invalid=['"]true['"]\]\s*\{[^}]*border-color:\s*var\(--destructive\)/s,
    )
  })

  it('defines bilingual sidebars and the external Core API link', async () => {
    const thai = await read(`${docsDir}/content/docs/meta.json`)
    const english = await read(`${docsDir}/content/docs/en/meta.json`)

    expect(thai).toContain('---อ้างอิง---')
    expect(english).toContain('---Reference---')
    expect(thai).toContain('"https://naay99999.github.io/thai-zip/"')
  })

  it('keeps internal links on the Fumadocs route structure', async () => {
    const entries = await readdir(path.join(root, docsDir, 'content/docs'), { recursive: true })
    const stale: string[] = []

    for (const entry of entries.filter((e) => e.endsWith('.mdx'))) {
      const content = await read(`${docsDir}/content/docs/${entry}`)
      if (content.includes('](/react-thai-zip/')) stale.push(entry)
    }

    expect(stale).toEqual([])
  })

  it('documents the cascade select partial-state boundary in both Forms guides', async () => {
    const thai = await read(`${docsDir}/content/docs/guides/forms.mdx`)
    const english = await read(`${docsDir}/content/docs/en/guides/forms.mdx`)

    expect(thai).toContain('จะไม่ส่ง resolved value จนกว่าจะเลือกครบทั้งสามระดับ')
    expect(thai).toContain('key={resetVersion}')
    expect(english).toContain('does not emit a resolved value until all three levels are selected')
    expect(english).toContain('key={resetVersion}')
  })

  it('ships the favicon served by the app', async () => {
    await expect(read(`${docsDir}/public/favicon.svg`)).resolves.toContain('<svg')
  })

  it('exposes a sandbox generator pinned to the docs stack', async () => {
    const manifest = JSON.parse(await read('package.json')) as {
      scripts?: Record<string, string>
    }

    expect(manifest.scripts?.sandbox).toBe('node scripts/sandbox.mjs')

    const generator = await read('scripts/sandbox.mjs')
    expect(generator).toContain("path.join(root, 'apps/docs/package.json')")
    expect(generator).toContain("'@tailwindcss/postcss'")
  })
})
```

- [ ] **Step 2: Run the full root test suite**

```bash
npm test
```

Expected: all test files pass, including the rewritten `tests/docs-site.test.ts` (17 files, 130+ tests total — the count grows with the new guards).

- [ ] **Step 3: Commit**

```bash
git add tests/docs-site.test.ts
git commit -m "test: rewrite docs-site guards for the Fumadocs layout"
```

---

### Task 6: Retire GitHub Pages, sweep docs, final verification

**Files:**
- Delete: `.github/workflows/docs.yml`
- Modify: `README.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: everything from Tasks 1–5.
- Produces: the finished repository state — Vercel is the only docs deployment path.

- [ ] **Step 1: Stand up the Vercel project (manual, requires the repo owner)**

On <https://vercel.com> (account `naay99999`): Add New Project → import `naay99999/react-thai-zip` → set **Root Directory** to `apps/docs` (Framework preset auto-detects Next.js) → Deploy. Note the production URL (expected `https://react-thai-zip.vercel.app`; adjust the next step if Vercel assigns a different name). Push the branch if the project imports the default branch — or deploy after this task's commits land on `main`.

- [ ] **Step 2: Sweep the README link**

In `README.md`, replace:

```markdown
📚 [Documentation and live component demos](https://naay99999.github.io/react-thai-zip/)
```

with:

```markdown
📚 [Documentation and live component demos](https://react-thai-zip.vercel.app)
```

(Use the actual production URL from Step 1 if it differs.)

- [ ] **Step 3: Update `CLAUDE.md`**

Update the `apps/` block in the Architecture tree to:

```
apps/
  docs/                          # Documentation website (Fumadocs on Next.js) — own package.json + lockfile, bilingual th (root locale) / en, imports templates via the @ alias, deployed on Vercel (root directory apps/docs)
  sandbox/                       # Generated by `npm run sandbox` (scripts/sandbox.mjs, pinned to apps/docs dependency versions) for testing the scaffolded components + CLI — gitignored, never committed
```

And in the `## Commands` section, append:

```bash
npm run sandbox                # regenerate apps/sandbox (gitignored Next.js playground pinned to the docs stack)
```

Also update the `tests/` entry for `docs-site.test.ts` if its description mentions Starlight — it now guards the Fumadocs layout (`content/docs`, `app/[lang]`, demo aliases, sandbox script).

- [ ] **Step 4: Delete the GitHub Pages workflow**

```bash
git rm .github/workflows/docs.yml
```

Then, in the GitHub repo (owner action): Settings → Pages → disable the Pages deployment, so the old `naay99999.github.io/react-thai-zip` URL stops shadowing search results.

- [ ] **Step 5: Final verification**

```bash
npm test
npm run typecheck
npm run typecheck:templates
npm run build
cd apps/docs && npm run build
```

Expected: all five commands pass. Confirm the working tree is clean apart from intentional changes:

```bash
git status --short
```

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/docs.yml README.md CLAUDE.md
git commit -m "chore: retire GitHub Pages docs workflow in favor of Vercel"
```

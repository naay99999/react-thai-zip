import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const docsDir = 'apps/docs'
const requiredDocSlugs = [
  'index.mdx',
  'getting-started.mdx',
  'components/index.mdx',
  'components/autocomplete.mdx',
  'components/cascade-select.mdx',
  'components/address-form.mdx',
  'components/address-display.mdx',
  'components/address-form-field.mdx',
  'guides/forms.mdx',
  'guides/customization.mdx',
  'guides/using-with-ai.md',
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

  it('has a private Next.js package with a deterministic production build', async () => {
    const manifest = JSON.parse(await read(`${docsDir}/package.json`)) as {
      private?: boolean
      scripts?: Record<string, string>
    }

    expect(manifest.private).toBe(true)
    expect(manifest.scripts).toMatchObject({
      dev: 'next dev',
      build: 'next build --webpack',
      start: 'next start',
    })
  })

  it('makes the monorepo root explicit for build tracing', async () => {
    const config = await read(`${docsDir}/next.config.mjs`)

    expect(config).toContain('turbopack:')
    expect(config).toContain('root: repositoryRoot')
    expect(config).toContain('outputFileTracingRoot: repositoryRoot')
  })

  it('builds the documentation site in CI, installing both the repo root and apps/docs', async () => {
    const workflow = await read('.github/workflows/ci.yml')

    expect(workflow).toMatch(
      /docs:[\s\S]*- run: npm ci --ignore-scripts\n[\s\S]*- run: npm ci --ignore-scripts\n\s*working-directory: apps\/docs\n[\s\S]*- run: npm run build\n\s*working-directory: apps\/docs/,
    )
  })

  it('overrides the Vercel install command to also install the repo root', async () => {
    const config = JSON.parse(await read(`${docsDir}/vercel.json`)) as {
      installCommand?: string
    }

    expect(config.installCommand).toBe('cd ../.. && npm ci && cd apps/docs && npm ci')
  })

  it('maps the template alias to the canonical templates directory', async () => {
    const config = await read(`${docsDir}/tsconfig.json`)

    expect(config).toMatch(/"@\/\*":\s*\[\s*"\.\.\/\.\.\/templates\/react\/ts\/\*"/)
  })

  it('does not track generated directories or the sandbox', async () => {
    const ignore = await read('.gitignore')

    expect(ignore).toContain('apps/docs/node_modules/')
    expect(ignore).toContain('apps/docs/.next/')
    expect(ignore).toContain('apps/docs/.source/')
    expect(ignore).toContain('apps/docs/.generated/')
    expect(ignore).toContain('apps/sandbox/')
  })

  it('does not contain copied component implementations', async () => {
    for (const dir of ['components', 'app', 'content', 'lib']) {
      const entries = await readdir(path.join(root, docsDir, dir), { recursive: true }).catch(
        () => [],
      )

      expect(entries.some((entry) => entry.endsWith('thai-address-autocomplete.tsx'))).toBe(false)
      expect(entries.some((entry) => entry.endsWith('thai-address-cascade-select.tsx'))).toBe(false)
      expect(entries.some((entry) => entry.endsWith('thai-address-form.tsx'))).toBe(false)
      expect(entries.some((entry) => entry.endsWith('thai-address-display.tsx'))).toBe(false)
      expect(entries.some((entry) => entry.endsWith('thai-address-form-field.tsx'))).toBe(false)
    }
  })

  it('maps the shadcn-style @/components alias to the canonical templates directory', async () => {
    const config = await read(`${docsDir}/tsconfig.json`)

    expect(config).toMatch(/"@\/components\/\*":\s*\[\s*"\.\.\/\.\.\/templates\/react\/ts\/\*"/)
  })

  it('previews every shadcn/ui style through the style-switch modules', async () => {
    const config = await read(`${docsDir}/tsconfig.json`)
    const manifest = JSON.parse(await read(`${docsDir}/package.json`)) as { scripts?: Record<string, string> }

    for (const [component, file] of [
      ['autocomplete', 'autocomplete'],
      ['cascade-select', 'cascade-select'],
      ['form', 'form'],
      ['form-field', 'form-field'],
    ]) {
      expect(config).toContain(`"@/components/thai-address-${component}": ["./components/style-switch/${file}"]`)
      const shim = await read(`${docsDir}/components/style-switch/${file}.tsx`)
      expect(shim).toContain('../../../../templates/react/ts/thai-address-')
      for (const base of ['base', 'radix', 'aria']) expect(shim).toContain(`.generated/styles/${base}/thai-address-`)
    }
    // The shadcn copies are generated before both dev and build.
    expect(manifest.scripts?.predev).toBe('node scripts/generate-styles.mjs')
    expect(manifest.scripts?.prebuild).toBe('node scripts/generate-styles.mjs')
  })

  it('examples import canonical templates through the @/components alias and are all registered', async () => {
    const files = (await readdir(path.join(root, docsDir, 'examples'))).filter((file) => file.endsWith('.tsx'))
    const registry = await read(`${docsDir}/examples/registry.ts`)

    expect(files.length).toBeGreaterThan(0)
    for (const file of files) {
      const source = await read(`${docsDir}/examples/${file}`)
      const name = file.replace(/\.tsx$/, '')

      expect(source).toMatch(/from '@\/components\/thai-address-[a-z-]+'/)
      expect(source).toContain('export default function')
      if (source.includes('useState') || source.includes('useForm')) expect(source).toContain("'use client'")
      expect(registry).toContain(`'${name}': `)
      expect(registry).toContain(`from './${name}'`)
    }
  })

  it('only references registered examples from the docs content', async () => {
    const registry = await read(`${docsDir}/examples/registry.ts`)
    const entries = await readdir(path.join(root, docsDir, 'content/docs'), { recursive: true })
    const missing: string[] = []

    for (const entry of entries.filter((e) => e.endsWith('.mdx'))) {
      const content = await read(`${docsDir}/content/docs/${entry}`)
      for (const [, name] of content.matchAll(/<ComponentPreview name="([^"]+)"/g)) {
        if (!registry.includes(`'${name}': `)) missing.push(`${entry}: ${name}`)
      }
    }

    expect(missing).toEqual([])
  })

  it('gives every component page a live preview and CLI + manual install section in both languages', async () => {
    for (const component of ['autocomplete', 'cascade-select', 'address-form', 'address-display', 'address-form-field']) {
      for (const prefix of ['', 'en/']) {
        const page = await read(`${docsDir}/content/docs/${prefix}components/${component}.mdx`)

        expect(page).toContain('<ComponentPreview name=')
        expect(page).toContain(`<ComponentInstall name="${component}"`)
      }
    }
  })

  it('form examples submit the hidden fields through FormData', async () => {
    const form = await read(`${docsDir}/examples/form-autocomplete.tsx`)

    expect(form).toContain('name="address"')
    expect(form).toContain('new FormData(event.currentTarget)')
  })

  it('visually distinguishes invalid example controls', async () => {
    const css = await read(`${docsDir}/styles/preview.css`)

    expect(css).toMatch(
      /\.tz-preview \[aria-invalid=['"]true['"]\]\s*\{[^}]*border-color:\s*var\(--destructive\)/s,
    )
  })

  it('serves Markdown for AI: per-page .md (including /docs.md) and llms.txt routes', async () => {
    const config = await read(`${docsDir}/next.config.mjs`)

    expect(config).toContain("source: '/docs.md'")
    expect(config).toContain("source: '/en/docs.md'")
    expect(config).toContain("source: '/docs/:slug*.md'")
    await expect(read(`${docsDir}/app/llms.txt/route.ts`)).resolves.toContain('renderDocsIndex')
    await expect(read(`${docsDir}/app/llms-full.txt/route.ts`)).resolves.toContain('renderFullDocs')
  })

  it('defines bilingual sidebars and the external Core API link', async () => {
    const thai = await read(`${docsDir}/content/docs/meta.json`)
    const english = await read(`${docsDir}/content/docs/en/meta.json`)
    const layout = await read(`${docsDir}/lib/layout.shared.tsx`)

    expect(thai).toContain('---อ้างอิง---')
    expect(english).toContain('---Reference---')
    expect(layout).toContain("'https://naay99999.github.io/thai-zip/'")
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
    expect(generator).toContain("'--npm'")
  })
})

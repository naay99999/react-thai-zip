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
      /docs:[\s\S]*- run: npm ci\n[\s\S]*- run: npm ci\n\s*working-directory: apps\/docs\n[\s\S]*- run: npm run build\n\s*working-directory: apps\/docs/,
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

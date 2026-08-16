import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const requiredDocSlugs = [
  'index.mdx',
  'getting-started.mdx',
  'components/autocomplete.mdx',
  'components/cascade-select.mdx',
  'guides/forms.mdx',
  'guides/customization.mdx',
]

async function read(relativePath: string): Promise<string> {
  return readFile(path.join(root, relativePath), 'utf8')
}

describe('documentation site structure', () => {
  it('keeps required Thai and English pages mirrored', async () => {
    for (const slug of requiredDocSlugs) {
      await expect(read(`docs/src/content/docs/${slug}`)).resolves.toBeTruthy()
      await expect(read(`docs/src/content/docs/en/${slug}`)).resolves.toBeTruthy()
    }
  })

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
    expect(config).toContain("{ label: 'Core API', link: 'https://naay99999.github.io/thai-zip/' }")
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

  it('demo wrappers import canonical templates through the template alias', async () => {
    const autocomplete = await read('docs/src/components/demos/AutocompleteDemo.tsx')
    const cascade = await read('docs/src/components/demos/CascadeSelectDemo.tsx')
    const form = await read('docs/src/components/demos/FormDemo.tsx')

    expect(autocomplete).toContain("from '@/thai-address-autocomplete'")
    expect(cascade).toContain("from '@/thai-address-cascade-select'")
    expect(cascade).toContain('export default CascadeSelectDemo')
    expect(form).toMatch(/from '@\/thai-address-(autocomplete|cascade-select)'/)
    expect(form).toContain('export default FormDemo')
  })

  it('form demo presents the localized current resolved address', async () => {
    const form = await read('docs/src/components/demos/FormDemo.tsx')

    expect(form).toContain('value.subdistrict')
    expect(form).toContain('value.subdistrictEn')
    expect(form).toContain('value.zipCode')
  })

  it('documents the cascade select partial-state boundary in both Forms guides', async () => {
    const thai = await read('docs/src/content/docs/guides/forms.mdx')
    const english = await read('docs/src/content/docs/en/guides/forms.mdx')

    expect(thai).toContain('จะไม่ส่ง resolved value จนกว่าจะเลือกครบทั้งสามระดับ')
    expect(thai).toContain('key={resetVersion}')
    expect(english).toContain('does not emit a resolved value until all three levels are selected')
    expect(english).toContain('key={resetVersion}')
  })
})

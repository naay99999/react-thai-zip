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
})

import { describe, expect, it } from 'vitest'
import { getPageMarkdownUrl, renderDocsIndex, renderFullDocs, renderPageMarkdown } from '../apps/docs/lib/docs-markdown.js'
import { getComponentStyles, getInstallVariants } from '../apps/docs/lib/component-install.js'
import { toPackageManager } from '../apps/docs/lib/package-manager.js'

const SITE = 'https://thai-zip.vercel.app'

type Root = Parameters<typeof renderDocsIndex>[1]['th']

function page(url: string, title: string, locale: string, body: string) {
  return {
    url,
    locale,
    data: {
      title,
      description: `${title} description`,
      getText: async (_type: 'processed') => body,
    },
  }
}

function tree(...nodes: Root['children']): Root {
  return { name: 'docs', children: nodes }
}

/** The `\0{json}\0` placeholder fumadocs emits for components listed in `mdxAsPlaceholder`. */
function placeholder(name: string, attributes: Record<string, string>) {
  return `\0${JSON.stringify({ name, children: '', attributes })}\0`
}

const pages = [
  page('/docs', 'บทนำ', 'th', 'ไทย'),
  page('/docs/react/autocomplete', 'ค้นหา', 'th', 'คอมโพเนนต์'),
  page('/docs/react/cli', 'CLI', 'th', 'คู่มือ'),
  page('/en/docs', 'Introduction', 'en', 'English'),
  page('/en/docs/react/cli', 'CLI', 'en', 'Guide'),
]
const trees = {
  th: tree(
    { type: 'page', name: 'บทนำ', url: '/docs' },
    { type: 'separator', name: 'คอมโพเนนต์' },
    { type: 'page', name: 'ค้นหา', url: '/docs/react/autocomplete' },
    { type: 'separator', name: 'คู่มือ' },
    { type: 'page', name: 'CLI', url: '/docs/react/cli' },
  ),
  en: tree(
    { type: 'page', name: 'Introduction', url: '/en/docs' },
    { type: 'separator', name: 'Guides' },
    { type: 'page', name: 'CLI', url: '/en/docs/react/cli' },
  ),
}

describe('docs Markdown output', () => {
  it('gives root and nested pages stable Markdown URLs in both languages', () => {
    expect(getPageMarkdownUrl(page('/docs', 'บทนำ', 'th', ''))).toBe('/docs.md')
    expect(getPageMarkdownUrl(page('/docs/react/autocomplete', 'ค้นหา', 'th', ''))).toBe('/docs/react/autocomplete.md')
    expect(getPageMarkdownUrl(page('/en/docs', 'Introduction', 'en', ''))).toBe('/en/docs.md')
    expect(getPageMarkdownUrl(page('/en/docs/react/autocomplete', 'Search', 'en', ''))).toBe('/en/docs/react/autocomplete.md')
  })

  it('indexes both languages in sidebar order with absolute Markdown links', () => {
    const index = renderDocsIndex(pages, trees)

    expect(index).toContain(`[Full documentation](${SITE}/llms-full.txt)`)
    expect(index).toContain(`[บทนำ](${SITE}/docs.md)`)
    expect(index).toContain(`[Introduction](${SITE}/en/docs.md)`)
    expect(index).toMatch(/### คอมโพเนนต์\n\n- \[ค้นหา\]\(https:\/\/thai-zip\.vercel\.app\/docs\/react\/autocomplete\.md\)/)
    expect(index.indexOf('### คอมโพเนนต์')).toBeLessThan(index.indexOf('### คู่มือ'))
    expect(index).not.toMatch(/\]\(\//)
  })

  it('starts a section at each sidebar tab (root folder)', () => {
    const index = renderDocsIndex(pages, {
      ...trees,
      th: tree({
        type: 'folder',
        name: 'react-thaizip',
        root: true,
        children: [{ type: 'page', name: 'ค้นหา', url: '/docs/react/autocomplete' }],
      }),
    })

    expect(index).toMatch(/### react-thaizip\n\n- \[ค้นหา\]/)
  })

  it('renders processed content with an absolute source URL and absolute links', async () => {
    const output = await renderPageMarkdown(
      page('/en/docs/react/autocomplete', 'Search', 'en', '## Example\n\nSee [forms](/en/docs/react/cli).'),
    )

    expect(output).toContain('# Search')
    expect(output).toContain(`Source: ${SITE}/en/docs/react/autocomplete`)
    expect(output).toContain(`## Example\n\nSee [forms](${SITE}/en/docs/react/cli).`)
  })

  it('makes JSX hrefs absolute too, e.g. the components overview cards', async () => {
    const output = await renderPageMarkdown(
      page('/en/docs/react', 'Components', 'en', '<Card title="Autocomplete" href="/en/docs/react/autocomplete" />'),
    )

    expect(output).toContain(`href="${SITE}/en/docs/react/autocomplete"`)
  })

  it('replaces previews with the example source and install sections with CLI + manual steps', async () => {
    const body = [
      placeholder('ComponentPreview', { name: 'autocomplete-demo' }),
      '## Install',
      placeholder('ComponentInstall', { name: 'autocomplete', lang: 'en' }),
    ].join('\n\n')
    const output = await renderPageMarkdown(page('/en/docs/react/autocomplete', 'Search', 'en', body))

    expect(output).toContain('```tsx title="autocomplete-demo.tsx"')
    expect(output).toContain("import { ThaiAddressAutocomplete } from '@/components/thai-address-autocomplete'")
    expect(output).toContain('npx react-thaizip add autocomplete')
    expect(output).toContain('**Manual — shadcn/ui · React Aria**')
    expect(output).toContain('npx shadcn@latest add popover command button')
    expect(output).toContain('templates/react/ts/shadcn/aria/thai-address-autocomplete.tsx')
    expect(output).not.toContain('\0')
  })

  it('includes both locales in the full document in sidebar order', async () => {
    const output = await renderFullDocs(pages, trees)

    expect(output).toContain('ไทย')
    expect(output).toContain('English')
    expect(output.indexOf('# ค้นหา')).toBeLessThan(output.indexOf('# CLI'))
    expect(output).toMatch(/คู่มือ\n\n---\n\n# Introduction/)
  })
})

describe('docs manual install steps', () => {
  it('derives files and dependencies from the CLI registry, including transitive items', () => {
    const [vanilla, base] = getInstallVariants('address-form')

    expect(vanilla.key).toBe('vanilla')
    expect(vanilla.dependencies).toContain('@base-ui/react')
    expect(vanilla.files.map((file) => file.target)).toEqual(
      expect.arrayContaining([
        'lib/utils.ts',
        'hooks/use-thai-address-index.ts',
        'hooks/use-thai-address-cascade.ts',
        'components/thai-address-cascade-select.tsx',
        'components/thai-address-form.tsx',
      ]),
    )
    expect(base.key).toBe('base')
    expect(base.dependencies).not.toContain('@base-ui/react')
    expect(base.files.map((file) => file.source)).toContain('react/ts/shadcn/base/thai-address-cascade-select.tsx')
  })

  it('offers only the vanilla variant for components without shadcn variants', () => {
    expect(getInstallVariants('address-display').map((variant) => variant.key)).toEqual(['vanilla'])
  })

  it('lists the styles for the page style picker, and none for non-component slugs', () => {
    expect(getComponentStyles('autocomplete')).toEqual(['vanilla', 'base', 'radix', 'aria'])
    expect(getComponentStyles('address-display')).toEqual(['vanilla'])
    expect(getComponentStyles('index')).toEqual([])
  })
})

describe('docs package manager commands', () => {
  it('converts npx and npm install the way remarkNpm does', () => {
    expect(toPackageManager('npx react-thaizip add autocomplete', 'npm')).toBe('npx react-thaizip add autocomplete')
    expect(toPackageManager('npx react-thaizip add autocomplete', 'pnpm')).toBe('pnpm dlx react-thaizip add autocomplete')
    expect(toPackageManager('npx shadcn@latest add popover', 'yarn')).toBe('yarn dlx shadcn@latest add popover')
    expect(toPackageManager('npx react-thaizip add autocomplete', 'bun')).toBe('bun x react-thaizip add autocomplete')
    expect(toPackageManager('npm install thaizip clsx', 'pnpm')).toBe('pnpm add thaizip clsx')
    expect(toPackageManager('npm install thaizip clsx', 'bun')).toBe('bun add thaizip clsx')
  })
})

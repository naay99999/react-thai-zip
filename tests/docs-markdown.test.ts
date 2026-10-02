import { describe, expect, it } from 'vitest'
import { getPageMarkdownUrl, renderDocsIndex, renderFullDocs, renderPageMarkdown } from '../apps/docs/lib/docs-markdown'

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

describe('docs Markdown output', () => {
  it('gives root and nested pages stable Markdown URLs in both languages', () => {
    expect(getPageMarkdownUrl(page('/docs', 'เริ่มต้น', 'th', ''))).toBe('/docs/index.md')
    expect(getPageMarkdownUrl(page('/docs/components/autocomplete', 'ค้นหา', 'th', ''))).toBe('/docs/components/autocomplete.md')
    expect(getPageMarkdownUrl(page('/en/docs', 'Start', 'en', ''))).toBe('/en/docs/index.md')
    expect(getPageMarkdownUrl(page('/en/docs/components/autocomplete', 'Search', 'en', ''))).toBe('/en/docs/components/autocomplete.md')
  })

  it('indexes both languages with links to Markdown pages and the full document', () => {
    const index = renderDocsIndex([
      page('/docs', 'เริ่มต้น', 'th', 'ไทย'),
      page('/docs/guides/using-with-ai', 'ใช้กับ AI', 'th', 'คู่มือ'),
      page('/en/docs', 'Start', 'en', 'English'),
      page('/en/docs/guides/using-with-ai', 'Use with AI', 'en', 'Guide'),
    ])

    expect(index).toContain('[Full documentation](/llms-full.txt)')
    expect(index).toContain('[AI usage guide (ไทย)](/docs/guides/using-with-ai.md)')
    expect(index).toContain('[AI usage guide (English)](/en/docs/guides/using-with-ai.md)')
    expect(index).toContain('[เริ่มต้น](/docs/index.md)')
    expect(index).toContain('[Start](/en/docs/index.md)')
    expect(index).not.toContain('](/docs)')
  })

  it('renders processed content with its page URL and language context', async () => {
    const output = await renderPageMarkdown(page('/en/docs/components/autocomplete', 'Search', 'en', '## Example\n\nUse the generated component.'))

    expect(output).toContain('# Search')
    expect(output).toContain('Source: /en/docs/components/autocomplete')
    expect(output).toContain('## Example\n\nUse the generated component.')
  })

  it('includes both locales in the full document with separate page boundaries', async () => {
    const output = await renderFullDocs([
      page('/docs', 'เริ่มต้น', 'th', 'เนื้อหาไทย'),
      page('/en/docs', 'Start', 'en', 'English content'),
    ])

    expect(output).toContain('เนื้อหาไทย')
    expect(output).toContain('English content')
    expect(output).toMatch(/เนื้อหาไทย\n\n---\n\n# Start/)
  })
})

import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildTokenBlock, ensureTokens, hasShadcnTokens } from '../src/utils/tokens.js'

describe('tokens', () => {
  it('hasShadcnTokens requires both --background and --input', () => {
    expect(hasShadcnTokens(':root { --background: 0 0% 100%; --input: 0 0% 89.8%; }')).toBe(true)
    expect(hasShadcnTokens(':root { --background: 0 0% 100%; }')).toBe(false)
  })

  it('v4 block includes @theme inline mapping; v3 block does not', () => {
    expect(buildTokenBlock(4)).toContain('@theme inline')
    expect(buildTokenBlock(4)).toContain('--color-background: var(--background)')
    expect(buildTokenBlock(3)).not.toContain('@theme')
    expect(buildTokenBlock(3)).toContain('--background: 0 0% 100%;')
  })

  it('v4 block enables class-based dark mode via @custom-variant', () => {
    // Without this, Tailwind v4 defaults `dark:` to a prefers-color-scheme
    // media query, so the emitted `.dark { ... }` block never applies.
    expect(buildTokenBlock(4)).toContain('@custom-variant dark (&:is(.dark *));')
  })

  it('ensureTokens appends once and skips when tokens exist', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'thaizip-tokens-'))
    const css = path.join(dir, 'globals.css')
    await writeFile(css, '@import "tailwindcss";\n')
    expect(await ensureTokens(css, 4)).toBe('written')
    expect(await ensureTokens(css, 4)).toBe('skipped')
    const content = await readFile(css, 'utf8')
    expect(content.match(/react-thaizip design tokens/g)).toHaveLength(1)
  })
})

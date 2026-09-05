import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { detectShadcn } from '../src/utils/detectShadcn.js'

async function tempDir() {
  return mkdtemp(path.join(os.tmpdir(), 'react-thaizip-shadcn-'))
}

async function writeComponentsJson(cwd: string, data: Record<string, unknown>) {
  await writeFile(path.join(cwd, 'components.json'), JSON.stringify(data))
}

describe('detectShadcn', () => {
  it('returns present: false when there is no components.json', async () => {
    const cwd = await tempDir()
    expect(await detectShadcn(cwd)).toEqual({ present: false })
  })

  it('returns present: false for unparseable JSON', async () => {
    const cwd = await tempDir()
    await writeFile(path.join(cwd, 'components.json'), '{not json')
    expect(await detectShadcn(cwd)).toEqual({ present: false })
  })

  it('detects a Base UI–backed project (style prefix "base-") and resolves the ui dir via tsconfig paths', async () => {
    const cwd = await tempDir()
    await writeComponentsJson(cwd, { style: 'base-nova', aliases: { ui: '@/components/ui' } })
    await writeFile(
      path.join(cwd, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { paths: { '@/*': ['./*'] } } }),
    )

    expect(await detectShadcn(cwd)).toEqual({
      present: true,
      supported: true,
      style: 'base-nova',
      base: 'base',
      uiAlias: '@/components/ui',
      uiDir: 'components/ui',
    })
  })

  it('resolves the ui dir under a src/ baseUrl mapping', async () => {
    const cwd = await tempDir()
    await writeComponentsJson(cwd, { style: 'base-nova', aliases: { ui: '@/components/ui' } })
    await writeFile(
      path.join(cwd, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { paths: { '@/*': ['./src/*'] } } }),
    )

    const result = await detectShadcn(cwd)
    expect(result).toMatchObject({ present: true, supported: true, uiDir: 'src/components/ui' })
  })

  it('falls back to the default alias and a src/-presence heuristic when tsconfig has no matching paths entry', async () => {
    const cwd = await tempDir()
    await mkdir(path.join(cwd, 'src'))
    await writeComponentsJson(cwd, { style: 'base-nova' })
    await writeFile(path.join(cwd, 'tsconfig.json'), JSON.stringify({ compilerOptions: {} }))

    const result = await detectShadcn(cwd)
    expect(result).toMatchObject({ present: true, supported: true, uiAlias: '@/components/ui', uiDir: 'src/components/ui' })
  })

  it('reads jsconfig.json when tsconfig.json is absent', async () => {
    const cwd = await tempDir()
    await writeComponentsJson(cwd, { style: 'base-nova', aliases: { ui: '@/components/ui' } })
    await writeFile(
      path.join(cwd, 'jsconfig.json'),
      JSON.stringify({ compilerOptions: { paths: { '@/*': ['./*'] } } }),
    )

    const result = await detectShadcn(cwd)
    expect(result).toMatchObject({ present: true, supported: true, uiDir: 'components/ui' })
  })

  it('treats an unrecognized style as unsupported', async () => {
    const cwd = await tempDir()
    await writeComponentsJson(cwd, { style: 'solid-nova' })
    expect(await detectShadcn(cwd)).toEqual({ present: true, supported: false, style: 'solid-nova' })
  })

  it('treats a missing/non-string style field as unsupported (present, but not mapped to a base)', async () => {
    const cwd = await tempDir()
    await writeComponentsJson(cwd, { aliases: { ui: '@/components/ui' } })
    expect(await detectShadcn(cwd)).toEqual({ present: true, supported: false, style: '' })
  })
})

describe('component library detection', () => {
  it.each([
    ['base-nova', 'base'],
    ['radix-nova', 'radix'],
    ['aria-nova', 'aria'],
    ['default', 'radix'],
    ['new-york', 'radix'],
  ])('maps style %s to base %s', async (style, expected) => {
    const cwd = await tempDir()
    await writeComponentsJson(cwd, { style, aliases: { ui: '@/components/ui' } })
    const detection = await detectShadcn(cwd)
    expect(detection).toMatchObject({ present: true, supported: true, base: expected })
  })

  it('treats an unrecognized style as unsupported', async () => {
    const cwd = await tempDir()
    await writeComponentsJson(cwd, { style: 'solid-nova' })
    expect(await detectShadcn(cwd)).toMatchObject({ present: true, supported: false })
  })

  it('treats a missing style as unsupported', async () => {
    const cwd = await tempDir()
    await writeComponentsJson(cwd, { aliases: { ui: '@/components/ui' } })
    expect(await detectShadcn(cwd)).toMatchObject({ present: true, supported: false })
  })
})

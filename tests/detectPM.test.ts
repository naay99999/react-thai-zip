import { mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { detectPM, getPackageManagerCommands } from '../src/utils/detectPM.js'

async function tempDir() {
  return mkdtemp(path.join(os.tmpdir(), 'react-thaizip-'))
}

describe('detectPM', () => {
  it('detects bun from bun.lockb', async () => {
    const cwd = await tempDir()
    await writeFile(path.join(cwd, 'bun.lockb'), '')
    await writeFile(path.join(cwd, 'package-lock.json'), '')
    await expect(detectPM(cwd)).resolves.toBe('bun')
  })

  it('detects bun from bun.lock text format (Bun 1.1+)', async () => {
    const cwd = await tempDir()
    await writeFile(path.join(cwd, 'bun.lock'), '')
    await expect(detectPM(cwd)).resolves.toBe('bun')
  })

  it('detects pnpm', async () => {
    const cwd = await tempDir()
    await writeFile(path.join(cwd, 'pnpm-lock.yaml'), '')
    await expect(detectPM(cwd)).resolves.toBe('pnpm')
  })

  it('detects yarn', async () => {
    const cwd = await tempDir()
    await writeFile(path.join(cwd, 'yarn.lock'), '')
    await expect(detectPM(cwd)).resolves.toBe('yarn')
  })

  it('falls back to npm', async () => {
    const cwd = await tempDir()
    await expect(detectPM(cwd)).resolves.toBe('npm')
  })
})

describe('getPackageManagerCommands().dlx', () => {
  // dlx is a distinct "fetch and run a remote package once" family from
  // exec (which only resolves node_modules/.bin) — see src/utils/detectPM.ts.
  it('npm: prefixes npx --yes so the fetch prompt is suppressed, flags before the positional package spec', () => {
    expect(getPackageManagerCommands('npm').dlx(['shadcn@latest', 'add', 'button'])).toEqual([
      'npx', '--yes', 'shadcn@latest', 'add', 'button',
    ])
  })

  it('pnpm: uses pnpm dlx', () => {
    expect(getPackageManagerCommands('pnpm').dlx(['shadcn@latest', 'add', 'button'])).toEqual([
      'pnpm', 'dlx', 'shadcn@latest', 'add', 'button',
    ])
  })

  it('yarn: uses yarn dlx (Yarn Berry; Yarn Classic v1 has no dlx)', () => {
    expect(getPackageManagerCommands('yarn').dlx(['shadcn@latest', 'add', 'button'])).toEqual([
      'yarn', 'dlx', 'shadcn@latest', 'add', 'button',
    ])
  })

  it('bun: uses bunx, same as exec', () => {
    expect(getPackageManagerCommands('bun').dlx(['shadcn@latest', 'add', 'button'])).toEqual([
      'bunx', 'shadcn@latest', 'add', 'button',
    ])
  })
})

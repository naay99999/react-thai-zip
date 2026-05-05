import { mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { detectPM } from '../src/utils/detectPM.js'

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

import { mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { detectProjectLanguage } from '../src/utils/detectLanguage.js'

async function tempDir() {
  return mkdtemp(path.join(os.tmpdir(), 'react-thaizip-'))
}

describe('detectProjectLanguage', () => {
  it('detects TypeScript projects', async () => {
    const cwd = await tempDir()
    await writeFile(path.join(cwd, 'tsconfig.json'), '{}')
    await expect(detectProjectLanguage(cwd)).resolves.toBe('ts')
  })

  it('detects JavaScript projects', async () => {
    const cwd = await tempDir()
    await writeFile(path.join(cwd, 'jsconfig.json'), '{}')
    await expect(detectProjectLanguage(cwd)).resolves.toBe('js')
  })

  it('returns unknown when no project config exists', async () => {
    const cwd = await tempDir()
    await expect(detectProjectLanguage(cwd)).resolves.toBe('unknown')
  })
})

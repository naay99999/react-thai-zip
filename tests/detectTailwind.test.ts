import { mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { detectTailwind } from '../src/utils/detectTailwind.js'

async function tempDir() {
  return mkdtemp(path.join(os.tmpdir(), 'react-thaizip-'))
}

describe('detectTailwind', () => {
  it.each(['tailwind.config.ts', 'tailwind.config.js', 'tailwind.config.cjs', 'tailwind.config.mjs'])(
    'detects %s',
    async (configFile) => {
      const cwd = await tempDir()
      await writeFile(path.join(cwd, configFile), '')
      await expect(detectTailwind(cwd)).resolves.toBe(true)
    },
  )

  it('returns false when no config exists', async () => {
    const cwd = await tempDir()
    await expect(detectTailwind(cwd)).resolves.toBe(false)
  })
})

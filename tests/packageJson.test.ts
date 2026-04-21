import { mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { hasPackageDependency } from '../src/utils/packageJson.js'

async function tempDir() {
  return mkdtemp(path.join(os.tmpdir(), 'react-thaizip-'))
}

describe('hasPackageDependency', () => {
  it.each(['dependencies', 'devDependencies', 'peerDependencies'])('finds packages in %s', async (field) => {
    const cwd = await tempDir()
    await writeFile(
      path.join(cwd, 'package.json'),
      JSON.stringify({
        [field]: {
          thaizip: '^0.3.0',
        },
      }),
    )

    await expect(hasPackageDependency('thaizip', cwd)).resolves.toBe(true)
  })

  it('returns false when package.json is missing', async () => {
    const cwd = await tempDir()
    await expect(hasPackageDependency('thaizip', cwd)).resolves.toBe(false)
  })
})

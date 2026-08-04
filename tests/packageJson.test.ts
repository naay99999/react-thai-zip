import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { getInstalledPackageVersion, getPackageDependencyRange, hasPackageDependency } from '../src/utils/packageJson.js'

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

describe('getPackageDependencyRange', () => {
  it('returns the declared range string', async () => {
    const cwd = await tempDir()
    await writeFile(path.join(cwd, 'package.json'), JSON.stringify({ dependencies: { thaizip: '^0.6.0' } }))

    await expect(getPackageDependencyRange('thaizip', cwd)).resolves.toBe('^0.6.0')
  })

  it('returns null when not declared', async () => {
    const cwd = await tempDir()
    await writeFile(path.join(cwd, 'package.json'), JSON.stringify({ dependencies: {} }))

    await expect(getPackageDependencyRange('thaizip', cwd)).resolves.toBeNull()
  })
})

describe('getInstalledPackageVersion', () => {
  it('reads the version from node_modules/<pkg>/package.json', async () => {
    const cwd = await tempDir()
    await mkdir(path.join(cwd, 'node_modules', 'thaizip'), { recursive: true })
    await writeFile(path.join(cwd, 'node_modules', 'thaizip', 'package.json'), JSON.stringify({ version: '0.6.0' }))

    await expect(getInstalledPackageVersion('thaizip', cwd)).resolves.toBe('0.6.0')
  })

  it('returns null when the package is not installed', async () => {
    const cwd = await tempDir()
    await expect(getInstalledPackageVersion('thaizip', cwd)).resolves.toBeNull()
  })
})

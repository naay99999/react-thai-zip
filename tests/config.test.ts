import { mkdtemp, readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { CORE_PACKAGE_VERSION, MINIMUM_THAIZIP_VERSION, configExists, getConfigPath, readConfig, writeConfig } from '../src/utils/config.js'
import { extractVersionAnchor, isVersionAtLeast } from '../src/utils/semver.js'

async function tempDir() {
  return mkdtemp(path.join(os.tmpdir(), 'react-thaizip-'))
}

describe('config', () => {
  // These assert properties rather than pinning the exact literal on
  // purpose: a hardcoded `toBe('^0.4.0')`-style assertion is what let
  // CORE_PACKAGE_VERSION drift two minors behind the published thaizip
  // range in the first place — the test suite "passed" the whole time the
  // scaffolded templates were broken. Asserting shape + a floor survives
  // routine version bumps while still catching a regression below the
  // version the templates actually require.
  it('CORE_PACKAGE_VERSION is a valid, parseable semver range', () => {
    expect(CORE_PACKAGE_VERSION).toMatch(/^[\^~>=<]*\d+\.\d+\.\d+$/)
    expect(extractVersionAnchor(CORE_PACKAGE_VERSION)).not.toBeNull()
  })

  it('CORE_PACKAGE_VERSION is at least the version whose exports the templates rely on (thaizip/react, added in 0.6.0)', () => {
    const anchor = extractVersionAnchor(CORE_PACKAGE_VERSION)
    expect(anchor).not.toBeNull()
    expect(isVersionAtLeast(anchor as string, MINIMUM_THAIZIP_VERSION)).toBe(true)
  })

  it('writes and reads thaizip.config.json', async () => {
    const cwd = await tempDir()
    const config = {
      typescript: true,
      componentDir: 'components',
      packageManager: 'npm' as const,
      corePackage: {
        name: 'thaizip' as const,
        version: '^0.3.0',
      },
      registryVersion: '0.1.0',
    }

    await writeConfig(config, cwd)

    await expect(configExists(cwd)).resolves.toBe(true)
    await expect(readConfig(cwd)).resolves.toEqual(config)
    await expect(readFile(getConfigPath(cwd), 'utf8')).resolves.toContain('"componentDir": "components"')
  })
})

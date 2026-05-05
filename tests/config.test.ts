import { mkdtemp, readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { CORE_PACKAGE_VERSION, configExists, getConfigPath, readConfig, writeConfig } from '../src/utils/config.js'

async function tempDir() {
  return mkdtemp(path.join(os.tmpdir(), 'react-thaizip-'))
}

describe('config', () => {
  it('CORE_PACKAGE_VERSION matches the current thaizip release', () => {
    expect(CORE_PACKAGE_VERSION).toBe('^0.4.0')
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

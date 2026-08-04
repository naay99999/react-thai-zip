import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import os, { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CORE_PACKAGE_VERSION,
  MINIMUM_THAIZIP_VERSION,
  configExists,
  getConfigPath,
  migrateLegacyConfig,
  readConfig,
  validateConfig,
  writeConfig,
} from '../src/utils/config.js'
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

  it('CORE_PACKAGE_VERSION is at least the version whose cascade/enumeration API and bilingual labels the templates rely on (0.7.0)', () => {
    const anchor = extractVersionAnchor(CORE_PACKAGE_VERSION)
    expect(anchor).not.toBeNull()
    expect(isVersionAtLeast(anchor as string, MINIMUM_THAIZIP_VERSION)).toBe(true)
  })

  it('writes and reads thaizip.config.json', async () => {
    const cwd = await tempDir()
    const config = {
      typescript: true as const,
      componentDir: 'components',
      libDir: 'lib',
      hooksDir: 'hooks',
      packageManager: 'npm' as const,
      tailwind: { version: 4 as const, css: '' },
      registryVersion: '0.1.0',
    }

    await writeConfig(config, cwd)

    await expect(configExists(cwd)).resolves.toBe(true)
    await expect(readConfig(cwd)).resolves.toEqual(config)
    await expect(readFile(getConfigPath(cwd), 'utf8')).resolves.toContain('"componentDir": "components"')
  })
})

const v2 = {
  typescript: true,
  componentDir: 'app/components',
  libDir: 'lib',
  hooksDir: 'hooks',
  packageManager: 'npm',
  tailwind: { version: 4, css: 'app/globals.css' },
  registryVersion: '1.0.0',
}

describe('validateConfig', () => {
  it('accepts a valid v2 config', () => {
    expect(validateConfig(v2)).toEqual({ ok: true, config: v2 })
  })
  it('names each bad field', () => {
    const result = validateConfig({ ...v2, componentDir: '', tailwind: { version: 2, css: 'x.css' } })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.join('\n')).toContain('componentDir')
      expect(result.errors.join('\n')).toContain('tailwind.version')
    }
  })
  it('rejects typescript: false with a migration hint', () => {
    const result = validateConfig({ ...v2, typescript: false })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join('\n')).toMatch(/no longer supported/)
  })
})

describe('migrateLegacyConfig', () => {
  it('fills v2 fields from a v1 config', () => {
    const legacy = {
      typescript: true, componentDir: 'src/components', packageManager: 'pnpm',
      corePackage: { name: 'thaizip', version: '>=0.6.0' }, registryVersion: '0.2.1',
    }
    expect(migrateLegacyConfig(legacy, { version: 3, css: 'src/index.css' })).toEqual({
      typescript: true, componentDir: 'src/components', libDir: 'lib', hooksDir: 'hooks',
      packageManager: 'pnpm', tailwind: { version: 3, css: 'src/index.css' }, registryVersion: '0.2.1',
    })
  })
  it('returns null for unrecognizable input', () => {
    expect(migrateLegacyConfig({ foo: 1 }, { version: 4, css: '' })).toBeNull()
  })
})

describe('readConfig migration', () => {
  it('migrates a legacy config file in place', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'thaizip-config-'))
    await writeFile(path.join(cwd, 'thaizip.config.json'), JSON.stringify({
      typescript: true, componentDir: 'components', packageManager: 'npm',
      corePackage: { name: 'thaizip', version: '>=0.6.0' }, registryVersion: '0.2.1',
    }))
    const config = await readConfig(cwd, { tailwind: { version: 4, css: 'app/globals.css' } })
    expect(config.libDir).toBe('lib')
    const onDisk = JSON.parse(await readFile(path.join(cwd, 'thaizip.config.json'), 'utf8'))
    expect(onDisk.hooksDir).toBe('hooks')
    expect(onDisk.corePackage).toBeUndefined()
  })
  it('throws a helpful error for an invalid config', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'thaizip-config-'))
    await writeFile(path.join(cwd, 'thaizip.config.json'), JSON.stringify({ componentDir: 42 }))
    await expect(readConfig(cwd)).rejects.toThrow(/react-thaizip init/)
  })
  it('rejects a legacy config that migrates to an invalid packageManager instead of writing it to disk', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'thaizip-config-'))
    const configPath = path.join(cwd, 'thaizip.config.json')
    await writeFile(configPath, JSON.stringify({
      typescript: true, componentDir: 'components', packageManager: 'deno',
      corePackage: { name: 'thaizip', version: '>=0.6.0' }, registryVersion: '0.2.1',
    }))
    await expect(readConfig(cwd)).rejects.toThrow(/react-thaizip init/)
    const onDisk = JSON.parse(await readFile(configPath, 'utf8'))
    expect(onDisk.libDir).toBeUndefined()
  })
  it('rejects a legacy config missing registryVersion instead of self-bricking on the next read', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'thaizip-config-'))
    const configPath = path.join(cwd, 'thaizip.config.json')
    await writeFile(configPath, JSON.stringify({
      typescript: true, componentDir: 'components', packageManager: 'npm',
      corePackage: { name: 'thaizip', version: '>=0.6.0' },
    }))
    await expect(readConfig(cwd)).rejects.toThrow(/react-thaizip init/)
    // A second read must fail the same way, not throw some other error —
    // proof nothing invalid was written to disk on the first attempt.
    await expect(readConfig(cwd)).rejects.toThrow(/react-thaizip init/)
    const onDisk = JSON.parse(await readFile(configPath, 'utf8'))
    expect(onDisk.libDir).toBeUndefined()
  })
})

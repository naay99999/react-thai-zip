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
  migrateV2Config,
  readConfig,
  validateConfig,
  writeConfig,
} from '../src/utils/config.js'
import { extractVersionAnchor, isVersionAtLeast } from '../src/utils/semver.js'

async function tempDir() {
  return mkdtemp(path.join(os.tmpdir(), 'react-thaizip-'))
}

describe('config', () => {
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
      style: 'vanilla' as const,
      shadcnUiAlias: '',
      shadcnUiDir: '',
      registryVersion: '0.1.0',
    }

    await writeConfig(config, cwd)

    await expect(configExists(cwd)).resolves.toBe(true)
    await expect(readConfig(cwd)).resolves.toEqual(config)
    await expect(readFile(getConfigPath(cwd), 'utf8')).resolves.toContain('"componentDir": "components"')
  })
})

const baseConfig = {
  typescript: true,
  componentDir: 'app/components',
  libDir: 'lib',
  hooksDir: 'hooks',
  packageManager: 'npm',
  tailwind: { version: 4, css: 'app/globals.css' },
  style: 'vanilla',
  shadcnUiAlias: '',
  shadcnUiDir: '',
  registryVersion: '1.0.0',
}

describe('validateConfig', () => {
  it('accepts a valid v3 config', () => {
    expect(validateConfig(baseConfig)).toEqual({ ok: true, config: baseConfig })
  })
  it('names each bad field', () => {
    const result = validateConfig({ ...baseConfig, componentDir: '', tailwind: { version: 2, css: 'x.css' } })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.join('\n')).toContain('componentDir')
      expect(result.errors.join('\n')).toContain('tailwind.version')
    }
  })
  it('accepts typescript: false as a boolean value', () => {
    const result = validateConfig({ ...baseConfig, typescript: false })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.config.typescript).toBe(false)
  })

  it('rejects non-boolean typescript values', () => {
    const invalidCases = [
      { ...baseConfig, typescript: 'yes' },
      { ...baseConfig, typescript: 1 },
      { ...baseConfig, typescript: undefined },
    ]
    for (const testCase of invalidCases) {
      const result = validateConfig(testCase)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.errors.join('\n')).toContain('typescript: expected a boolean')
    }
  })

  it('accepts style: "shadcn" with a populated alias/dir', () => {
    const result = validateConfig({
      ...baseConfig,
      style: 'shadcn',
      shadcnUiAlias: '@/components/ui',
      shadcnUiDir: 'app/components/ui',
    })
    expect(result.ok).toBe(true)
  })

  it('rejects an unrecognized style value', () => {
    const result = validateConfig({ ...baseConfig, style: 'bootstrap' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join('\n')).toContain('style')
  })

  it('rejects a non-string shadcnUiAlias/shadcnUiDir', () => {
    const result = validateConfig({ ...baseConfig, shadcnUiAlias: 42, shadcnUiDir: null })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.join('\n')).toContain('shadcnUiAlias')
      expect(result.errors.join('\n')).toContain('shadcnUiDir')
    }
  })

  it('rejects a shadcnUiDir that climbs out of the project, but accepts an empty one', () => {
    expect(validateConfig({ ...baseConfig, shadcnUiDir: '../../escape' }).ok).toBe(false)
    expect(validateConfig({ ...baseConfig, shadcnUiDir: '' }).ok).toBe(true)
  })
})

describe('migrateLegacyConfig', () => {
  it('fills v3 fields directly from a v1 config', () => {
    const legacy = {
      typescript: true, componentDir: 'src/components', packageManager: 'pnpm',
      corePackage: { name: 'thaizip', version: '>=0.6.0' }, registryVersion: '0.2.1',
    }
    expect(migrateLegacyConfig(legacy, { version: 3, css: 'src/index.css' })).toEqual({
      typescript: true, componentDir: 'src/components', libDir: 'lib', hooksDir: 'hooks',
      packageManager: 'pnpm', tailwind: { version: 3, css: 'src/index.css' },
      style: 'vanilla', shadcnUiAlias: '', shadcnUiDir: '',
      registryVersion: '0.2.1',
    })
  })
  it('returns null for unrecognizable input', () => {
    expect(migrateLegacyConfig({ foo: 1 }, { version: 4, css: '' })).toBeNull()
  })
})

describe('migrateV2Config', () => {
  it('backfills style/shadcnUiAlias/shadcnUiDir onto a v2 config', () => {
    const v2 = {
      typescript: true, componentDir: 'app/components', libDir: 'lib', hooksDir: 'hooks',
      packageManager: 'npm', tailwind: { version: 4, css: 'app/globals.css' }, registryVersion: '1.0.0',
    }
    expect(migrateV2Config(v2)).toEqual({ ...v2, style: 'vanilla', shadcnUiAlias: '', shadcnUiDir: '' })
  })
  it('returns null when style is already present', () => {
    expect(migrateV2Config({ ...baseConfig })).toBeNull()
  })
  it('returns null for a v1-shaped config (no libDir)', () => {
    expect(migrateV2Config({ typescript: true, componentDir: 'src', packageManager: 'npm' })).toBeNull()
  })
})

describe('readConfig migration', () => {
  it('migrates a legacy v1 config file in place', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'thaizip-config-'))
    await writeFile(path.join(cwd, 'thaizip.config.json'), JSON.stringify({
      typescript: true, componentDir: 'components', packageManager: 'npm',
      corePackage: { name: 'thaizip', version: '>=0.6.0' }, registryVersion: '0.2.1',
    }))
    const config = await readConfig(cwd, { tailwind: { version: 4, css: 'app/globals.css' } })
    expect(config.libDir).toBe('lib')
    expect(config.style).toBe('vanilla')
    const onDisk = JSON.parse(await readFile(path.join(cwd, 'thaizip.config.json'), 'utf8'))
    expect(onDisk.hooksDir).toBe('hooks')
    expect(onDisk.style).toBe('vanilla')
    expect(onDisk.corePackage).toBeUndefined()
  })

  it('migrates a v2 config (missing style) file in place', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'thaizip-config-'))
    const configPath = path.join(cwd, 'thaizip.config.json')
    await writeFile(configPath, JSON.stringify({
      typescript: true, componentDir: 'app/components', libDir: 'lib', hooksDir: 'hooks',
      packageManager: 'npm', tailwind: { version: 4, css: 'app/globals.css' }, registryVersion: '1.0.0',
    }))
    const config = await readConfig(cwd)
    expect(config.style).toBe('vanilla')
    expect(config.shadcnUiAlias).toBe('')
    const onDisk = JSON.parse(await readFile(configPath, 'utf8'))
    expect(onDisk.style).toBe('vanilla')
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
    await expect(readConfig(cwd)).rejects.toThrow(/react-thaizip init/)
    const onDisk = JSON.parse(await readFile(configPath, 'utf8'))
    expect(onDisk.libDir).toBeUndefined()
  })
})

describe('validateConfig directory-path safety', () => {
  const dirKeys = ['componentDir', 'libDir', 'hooksDir'] as const

  for (const key of dirKeys) {
    it(`rejects a ${key} that climbs out of the project with ..`, () => {
      const result = validateConfig({ ...baseConfig, [key]: '../../../../tmp/pwned' })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.errors.join('\n')).toContain(key)
    })

    it(`rejects an absolute ${key}`, () => {
      const result = validateConfig({ ...baseConfig, [key]: '/tmp/pwned' })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.errors.join('\n')).toContain(key)
    })

    it(`rejects a ${key} containing a quote character`, () => {
      const result = validateConfig({ ...baseConfig, [key]: "lib'; evil()" })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.errors.join('\n')).toContain(key)
    })
  }

  it('rejects a .. segment buried mid-path', () => {
    const result = validateConfig({ ...baseConfig, componentDir: 'app/../../escape' })
    expect(result.ok).toBe(false)
  })

  it('rejects a Windows-style absolute path', () => {
    const result = validateConfig({ ...baseConfig, componentDir: 'C:\\Windows\\Temp' })
    expect(result.ok).toBe(false)
  })

  it('rejects a .. segment written with a backslash separator', () => {
    const result = validateConfig({ ...baseConfig, componentDir: 'app\\..\\..\\escape' })
    expect(result.ok).toBe(false)
  })

  it('still accepts ordinary nested project-relative directories', () => {
    expect(validateConfig({ ...baseConfig, componentDir: 'src/components/ui' }).ok).toBe(true)
  })

  it('accepts a directory name that merely contains dots', () => {
    expect(validateConfig({ ...baseConfig, componentDir: 'app/..components' }).ok).toBe(true)
  })
})

describe('readConfig rejects an unsafe config on disk', () => {
  it('throws with a re-run-init hint rather than handing back a traversing path', async () => {
    const cwd = await tempDir()
    await writeFile(getConfigPath(cwd), JSON.stringify({ ...baseConfig, libDir: '../../../../tmp/pwned' }), 'utf8')

    await expect(readConfig(cwd)).rejects.toThrow(/libDir/)
  })
})

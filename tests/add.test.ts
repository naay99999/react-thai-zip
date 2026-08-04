import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import prompts from 'prompts'
import { addComponents } from '../src/commands/add.js'
import { writeConfig } from '../src/utils/config.js'
import { pathExists } from '../src/utils/fs.js'
import type { RegistryItem } from '../src/registry.js'

vi.mock('prompts', () => ({
  default: vi.fn(),
}))

const mockedPrompts = vi.mocked(prompts)

async function tempDir() {
  return mkdtemp(path.join(os.tmpdir(), 'react-thaizip-'))
}

async function tempProjectWithConfigV2(options: { thaizipRange?: string } = {}) {
  const cwd = await tempDir()
  const thaizipRange = options.thaizipRange ?? '^0.7.0'
  await writeFile(path.join(cwd, 'package.json'), JSON.stringify({ dependencies: { thaizip: thaizipRange } }))
  await writeConfig(
    {
      typescript: true,
      componentDir: 'app/components',
      libDir: 'lib',
      hooksDir: 'hooks',
      packageManager: 'npm',
      tailwind: { version: 4, css: 'app/globals.css' },
      registryVersion: '0.1.0',
    },
    cwd,
  )
  return cwd
}

const syntheticRegistry: RegistryItem[] = [
  {
    name: 'utils',
    description: 'cn helper',
    aliases: ['utils'],
    type: 'lib',
    files: [{ source: 'react/ts/ThaiAddressAutocomplete.tsx', target: { dir: 'libDir', file: 'utils.ts' } }],
    dependencies: [],
    registryDependencies: [],
  },
  {
    name: 'widget',
    description: 'test widget',
    aliases: ['widget'],
    type: 'component',
    files: [{ source: 'react/ts/ThaiAddressAutocomplete.tsx', target: { dir: 'componentDir', file: 'Widget.tsx' } }],
    dependencies: ['thaizip'],
    registryDependencies: ['utils'],
  },
]

describe('addComponents', () => {
  const originalLog = console.log
  const originalExitCode = process.exitCode

  beforeEach(() => {
    console.log = vi.fn()
    process.exitCode = originalExitCode
    mockedPrompts.mockReset()
  })

  afterEach(() => {
    console.log = originalLog
    process.exitCode = originalExitCode
    vi.restoreAllMocks()
  })

  it('prompts for components when no target is provided', async () => {
    const cwd = await tempProjectWithConfigV2()
    mockedPrompts.mockResolvedValueOnce({ components: ['ThaiAddressCascadeSelect'] })

    await addComponents({ cwd, targets: [] })

    await expect(readFile(path.join(cwd, 'app/components', 'ThaiAddressCascadeSelect.tsx'), 'utf8')).resolves.toContain(
      'export function ThaiAddressCascadeSelect',
    )
  })

  it('skips existing files unless overwrite is confirmed', async () => {
    const cwd = await tempProjectWithConfigV2()
    const destination = path.join(cwd, 'app/components', 'ThaiAddressAutocomplete.tsx')
    await mkdir(path.dirname(destination), { recursive: true })
    await writeFile(destination, 'existing content')
    mockedPrompts.mockResolvedValueOnce({ value: false })

    await addComponents({ cwd, targets: ['autocomplete'] })

    await expect(readFile(destination, 'utf8')).resolves.toBe('existing content')
  })

  it('Autocomplete clear button uses ✕ not x', async () => {
    const cwd = await tempProjectWithConfigV2()
    await addComponents({ cwd, targets: ['autocomplete'] })
    const content = await readFile(path.join(cwd, 'app/components', 'ThaiAddressAutocomplete.tsx'), 'utf8')
    expect(content).toContain('✕')
  })

  it('CascadeSelect uses English default labels and supports texts prop', async () => {
    const cwd = await tempProjectWithConfigV2()
    await addComponents({ cwd, targets: ['ThaiAddressCascadeSelect'] })
    const content = await readFile(path.join(cwd, 'app/components', 'ThaiAddressCascadeSelect.tsx'), 'utf8')
    expect(content).toContain("provinceLabel: 'Province'")
    expect(content).toContain("districtLabel: 'District'")
    expect(content).toContain("subdistrictLabel: 'Sub District'")
    expect(content).toContain("postalCodeLabel: 'Postal Code'")
    expect(content).toContain('texts?: Partial<Texts>')
  })

  it('CascadeSelect uses htmlFor to associate labels with selects', async () => {
    const cwd = await tempProjectWithConfigV2()
    await addComponents({ cwd, targets: ['ThaiAddressCascadeSelect'] })
    const content = await readFile(path.join(cwd, 'app/components', 'ThaiAddressCascadeSelect.tsx'), 'utf8')
    expect(content).toContain('htmlFor')
    expect(content).toContain('useId')
  })

  it('CascadeSelect accepts onClear prop and resets downstream selections', async () => {
    const cwd = await tempProjectWithConfigV2()
    await addComponents({ cwd, targets: ['ThaiAddressCascadeSelect'] })
    const content = await readFile(path.join(cwd, 'app/components', 'ThaiAddressCascadeSelect.tsx'), 'utf8')
    expect(content).toContain('onClear')
    expect(content).toContain('onClear?.()')
  })

  it('blocks scaffolding and explains why when thaizip is declared below the version required for the cascade/enumeration API', async () => {
    const cwd = await tempProjectWithConfigV2({ thaizipRange: '^0.4.0' })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    await addComponents({ cwd, targets: ['autocomplete'] })

    expect(process.exitCode).toBe(1)
    await expect(pathExists(path.join(cwd, 'app/components', 'ThaiAddressAutocomplete.tsx'))).resolves.toBe(false)
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('>=0.7.0'))
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('found 0.4.0'))
  })

  it('scaffolds normally when thaizip satisfies the required version', async () => {
    const cwd = await tempProjectWithConfigV2({ thaizipRange: '^0.7.0' })

    await addComponents({ cwd, targets: ['autocomplete'] })

    await expect(pathExists(path.join(cwd, 'app/components', 'ThaiAddressAutocomplete.tsx'))).resolves.toBe(true)
  })

  it('prefers the version actually installed under node_modules over the declared range', async () => {
    const cwd = await tempProjectWithConfigV2({ thaizipRange: '^0.7.0' })
    // package.json declares a satisfying range, but the version actually
    // resolved on disk is older — node_modules should win since that's
    // what will actually be imported at build time.
    await mkdir(path.join(cwd, 'node_modules', 'thaizip'), { recursive: true })
    await writeFile(path.join(cwd, 'node_modules', 'thaizip', 'package.json'), JSON.stringify({ version: '0.5.1' }))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    await addComponents({ cwd, targets: ['autocomplete'] })

    expect(process.exitCode).toBe(1)
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('found 0.5.1'))
  })

  it('scaffolds registryDependencies before the component, into libDir', async () => {
    const cwd = await tempProjectWithConfigV2()
    await addComponents({ cwd, targets: ['widget'], yes: true, registry: syntheticRegistry })
    expect(await pathExists(path.join(cwd, 'lib/utils.ts'))).toBe(true)
    expect(await pathExists(path.join(cwd, 'app/components/Widget.tsx'))).toBe(true)
  })

  it('never overwrites an existing lib file even with --overwrite', async () => {
    const cwd = await tempProjectWithConfigV2()
    await mkdir(path.join(cwd, 'lib'), { recursive: true })
    await writeFile(path.join(cwd, 'lib/utils.ts'), '// mine\n')
    await addComponents({ cwd, targets: ['widget'], yes: true, overwrite: true, registry: syntheticRegistry })
    expect(await readFile(path.join(cwd, 'lib/utils.ts'), 'utf8')).toBe('// mine\n')
  })

  it('gates on thaizip 0.7.0', async () => {
    const cwd = await tempProjectWithConfigV2({ thaizipRange: '^0.6.2' })
    await addComponents({ cwd, targets: ['autocomplete'], yes: true })
    expect(process.exitCode).toBe(1)
    process.exitCode = 0
  })

  it('--yes skips the overwrite prompt by skipping existing component files', async () => {
    const cwd = await tempProjectWithConfigV2()
    await addComponents({ cwd, targets: ['autocomplete'], yes: true })
    const first = await readFile(path.join(cwd, 'app/components/ThaiAddressAutocomplete.tsx'), 'utf8')
    await writeFile(path.join(cwd, 'app/components/ThaiAddressAutocomplete.tsx'), '// modified\n')
    await addComponents({ cwd, targets: ['autocomplete'], yes: true })
    expect(await readFile(path.join(cwd, 'app/components/ThaiAddressAutocomplete.tsx'), 'utf8')).toBe('// modified\n')
    void first
  })

  it('migrates a legacy v1 config on disk and scaffolds normally', async () => {
    const cwd = await tempDir()
    await writeFile(path.join(cwd, 'package.json'), JSON.stringify({ dependencies: { thaizip: '^0.7.0' } }))
    await mkdir(path.join(cwd, 'app'), { recursive: true })
    await writeFile(path.join(cwd, 'app', 'globals.css'), '@import "tailwindcss";\n')
    await writeFile(
      path.join(cwd, 'thaizip.config.json'),
      JSON.stringify({ componentDir: 'app/components', packageManager: 'npm', registryVersion: '0.1.0' }),
    )

    await addComponents({ cwd, targets: ['autocomplete'], yes: true })

    const migrated = JSON.parse(await readFile(path.join(cwd, 'thaizip.config.json'), 'utf8'))
    expect(migrated.typescript).toBe(true)
    expect(migrated.libDir).toBe('lib')
    expect(migrated.hooksDir).toBe('hooks')
    expect(migrated.tailwind).toEqual({ version: 4, css: 'app/globals.css' })
    await expect(pathExists(path.join(cwd, 'app/components', 'ThaiAddressAutocomplete.tsx'))).resolves.toBe(true)
  })

  it('rejects a legacy config with typescript: false instead of silently migrating it to TypeScript', async () => {
    const cwd = await tempDir()
    await writeFile(path.join(cwd, 'package.json'), JSON.stringify({ dependencies: { thaizip: '^0.7.0' } }))
    await mkdir(path.join(cwd, 'app'), { recursive: true })
    await writeFile(path.join(cwd, 'app', 'globals.css'), '@import "tailwindcss";\n')
    await writeFile(
      path.join(cwd, 'thaizip.config.json'),
      JSON.stringify({ typescript: false, componentDir: 'app/components', packageManager: 'npm', registryVersion: '0.1.0' }),
    )

    await expect(addComponents({ cwd, targets: ['autocomplete'], yes: true })).rejects.toThrow(/no longer supported/)
    await expect(pathExists(path.join(cwd, 'app/components', 'ThaiAddressAutocomplete.tsx'))).resolves.toBe(false)
  })

  it('exits 1 without throwing when bootstrap init cannot write a config (Tailwind missing)', async () => {
    const cwd = await tempDir()
    await writeFile(path.join(cwd, 'package.json'), JSON.stringify({ dependencies: {} }))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(addComponents({ cwd, targets: ['autocomplete'], yes: true })).resolves.toBeUndefined()

    expect(process.exitCode).toBe(1)
    await expect(pathExists(path.join(cwd, 'thaizip.config.json'))).resolves.toBe(false)
    consoleError.mockRestore()
  })
})

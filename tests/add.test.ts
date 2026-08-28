import { mkdir, mkdtemp, readFile, readdir, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import prompts from 'prompts'
import { addComponents } from '../src/commands/add.js'
import { writeConfig } from '../src/utils/config.js'
import { pathExists } from '../src/utils/fs.js'
import { installPackage } from '../src/utils/install.js'
import type { RegistryItem } from '../src/registry.js'

vi.mock('prompts', () => ({
  default: vi.fn(),
}))

vi.mock('../src/utils/install.js', () => ({
  installPackage: vi.fn().mockResolvedValue(undefined),
}))

const mockedPrompts = vi.mocked(prompts)
const mockedInstallPackage = vi.mocked(installPackage)

async function tempDir() {
  return mkdtemp(path.join(os.tmpdir(), 'react-thaizip-'))
}

async function tempProjectWithConfigV2(options: { thaizipRange?: string } = {}) {
  const cwd = await tempDir()
  const thaizipRange = options.thaizipRange ?? '^0.7.0'
  // Pre-declare every npm dependency the registry items can pull in (thaizip,
  // Base UI, and utils' clsx/tailwind-merge) so getMissingDependencies finds
  // nothing to install — scaffolding tests would otherwise trigger a real
  // `npm install` into the temp project, which is slow and network-dependent.
  await writeFile(
    path.join(cwd, 'package.json'),
    JSON.stringify({
      dependencies: {
        thaizip: thaizipRange,
        '@base-ui/react': '^1.0.0',
        clsx: '^2.0.0',
        'tailwind-merge': '^2.0.0',
      },
    }),
  )
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
    files: [{ source: 'react/ts/thai-address-cascade-select.tsx', target: { dir: 'libDir', file: 'utils.ts' } }],
    dependencies: [],
    registryDependencies: [],
  },
  {
    name: 'widget',
    description: 'test widget',
    aliases: ['widget'],
    type: 'component',
    files: [{ source: 'react/ts/thai-address-cascade-select.tsx', target: { dir: 'componentDir', file: 'Widget.tsx' } }],
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
    mockedInstallPackage.mockReset()
    mockedInstallPackage.mockResolvedValue(undefined)
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

    await expect(readFile(path.join(cwd, 'app/components', 'thai-address-cascade-select.tsx'), 'utf8')).resolves.toContain(
      'export function ThaiAddressCascadeSelect',
    )
  })

  it('skips existing files unless overwrite is confirmed', async () => {
    const cwd = await tempProjectWithConfigV2()
    const destination = path.join(cwd, 'app/components', 'thai-address-autocomplete.tsx')
    await mkdir(path.dirname(destination), { recursive: true })
    await writeFile(destination, 'existing content')
    mockedPrompts.mockResolvedValueOnce({ value: false })

    await addComponents({ cwd, targets: ['autocomplete'] })

    await expect(readFile(destination, 'utf8')).resolves.toBe('existing content')
  })

  it('names the relative path (not just the bare filename) in the skip log', async () => {
    const cwd = await tempProjectWithConfigV2()
    const destination = path.join(cwd, 'app/components', 'thai-address-autocomplete.tsx')
    await mkdir(path.dirname(destination), { recursive: true })
    await writeFile(destination, 'existing content')
    mockedPrompts.mockResolvedValueOnce({ value: false })

    await addComponents({ cwd, targets: ['autocomplete'] })

    const logged = (console.log as ReturnType<typeof vi.fn>).mock.calls.map((call) => call.join(' ')).join('\n')
    expect(logged).toContain('Skipped app/components/thai-address-autocomplete.tsx')
  })

  it('installs the missing thaizip dependency with the pinned >=0.7.0 range while leaving other packages bare', async () => {
    const cwd = await tempDir()
    await writeFile(path.join(cwd, 'package.json'), JSON.stringify({ dependencies: {} }))
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

    await addComponents({ cwd, targets: ['autocomplete'], yes: true })

    expect(mockedInstallPackage).toHaveBeenCalledTimes(1)
    const [specs, options] = mockedInstallPackage.mock.calls[0]
    expect(specs).toContain('thaizip@>=0.7.0')
    expect(specs).not.toContain('thaizip')
    expect(specs).toEqual(expect.arrayContaining(['clsx', 'tailwind-merge', '@base-ui/react']))
    expect(options).toEqual({ cwd, pm: 'npm' })
  })

  it('Autocomplete clear button uses ✕ not x', async () => {
    const cwd = await tempProjectWithConfigV2()
    await addComponents({ cwd, targets: ['autocomplete'] })
    const content = await readFile(path.join(cwd, 'app/components', 'thai-address-autocomplete.tsx'), 'utf8')
    expect(content).toContain('✕')
  })

  it('prints a valid import hint for autocomplete despite its kebab-case filename', async () => {
    const cwd = await tempProjectWithConfigV2()
    await addComponents({ cwd, targets: ['autocomplete'], yes: true })
    const logged = (console.log as ReturnType<typeof vi.fn>).mock.calls.map((call) => call.join(' ')).join('\n')
    expect(logged).toContain('import { ThaiAddressAutocomplete }')
    expect(logged).not.toContain('import { thai-address-autocomplete }')
  })

  it('CascadeSelect uses English default labels and supports texts prop', async () => {
    const cwd = await tempProjectWithConfigV2()
    await addComponents({ cwd, targets: ['ThaiAddressCascadeSelect'] })
    const content = await readFile(path.join(cwd, 'app/components', 'thai-address-cascade-select.tsx'), 'utf8')
    expect(content).toContain("provinceLabel: 'Province'")
    expect(content).toContain("districtLabel: 'District'")
    expect(content).toContain("subdistrictLabel: 'Sub-district'")
    expect(content).toContain("zipLabel: 'Postal code'")
    expect(content).toContain('texts?: Partial<ThaiAddressCascadeSelectTexts>')
  })

  it('CascadeSelect uses htmlFor to associate labels with selects', async () => {
    const cwd = await tempProjectWithConfigV2()
    await addComponents({ cwd, targets: ['ThaiAddressCascadeSelect'] })
    const content = await readFile(path.join(cwd, 'app/components', 'thai-address-cascade-select.tsx'), 'utf8')
    expect(content).toContain('htmlFor')
    expect(content).toContain('useId')
  })

  it('CascadeSelect resets downstream selections via onValueChange(null) rather than a legacy onClear prop', async () => {
    const cwd = await tempProjectWithConfigV2()
    await addComponents({ cwd, targets: ['ThaiAddressCascadeSelect'] })
    const content = await readFile(path.join(cwd, 'app/components', 'thai-address-cascade-select.tsx'), 'utf8')
    expect(content).toContain('onValueChange?.(null)')
    expect(content).not.toContain('onClear')
  })

  it('cascade-select scaffolds the shared lib/hook files alongside the component', async () => {
    const cwd = await tempProjectWithConfigV2()
    await addComponents({ cwd, targets: ['cascade-select'], yes: true })
    expect(await pathExists(path.join(cwd, 'app/components/thai-address-cascade-select.tsx'))).toBe(true)
    expect(await pathExists(path.join(cwd, 'lib/utils.ts'))).toBe(true)
    expect(await pathExists(path.join(cwd, 'hooks/use-thai-address-index.ts'))).toBe(true)
  })

  it('blocks scaffolding and explains why when thaizip is declared below the version required for the cascade/enumeration API', async () => {
    const cwd = await tempProjectWithConfigV2({ thaizipRange: '^0.4.0' })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    await addComponents({ cwd, targets: ['autocomplete'] })

    expect(process.exitCode).toBe(1)
    await expect(pathExists(path.join(cwd, 'app/components', 'thai-address-autocomplete.tsx'))).resolves.toBe(false)
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('>=0.7.0'))
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('found 0.4.0'))
  })

  it('scaffolds normally when thaizip satisfies the required version', async () => {
    const cwd = await tempProjectWithConfigV2({ thaizipRange: '^0.7.0' })

    await addComponents({ cwd, targets: ['autocomplete'] })

    await expect(pathExists(path.join(cwd, 'app/components', 'thai-address-autocomplete.tsx'))).resolves.toBe(true)
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
    const first = await readFile(path.join(cwd, 'app/components/thai-address-autocomplete.tsx'), 'utf8')
    await writeFile(path.join(cwd, 'app/components/thai-address-autocomplete.tsx'), '// modified\n')
    await addComponents({ cwd, targets: ['autocomplete'], yes: true })
    expect(await readFile(path.join(cwd, 'app/components/thai-address-autocomplete.tsx'), 'utf8')).toBe('// modified\n')
    void first
  })

  it('migrates a legacy v1 config on disk and scaffolds normally', async () => {
    const cwd = await tempDir()
    await writeFile(
      path.join(cwd, 'package.json'),
      JSON.stringify({
        dependencies: {
          thaizip: '^0.7.0',
          '@base-ui/react': '^1.0.0',
          clsx: '^2.0.0',
          'tailwind-merge': '^2.0.0',
        },
      }),
    )
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
    await expect(pathExists(path.join(cwd, 'app/components', 'thai-address-autocomplete.tsx'))).resolves.toBe(true)
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
    await expect(pathExists(path.join(cwd, 'app/components', 'thai-address-autocomplete.tsx'))).resolves.toBe(false)
  })

  it('scaffolds the real utils and use-thai-address-index items into libDir/hooksDir', async () => {
    const cwd = await tempProjectWithConfigV2()
    await addComponents({ cwd, targets: ['utils', 'use-thai-address-index'], yes: true })
    const utils = await readFile(path.join(cwd, 'lib/utils.ts'), 'utf8')
    expect(utils).toContain('twMerge(clsx(inputs))')
    const hook = await readFile(path.join(cwd, 'hooks/use-thai-address-index.ts'), 'utf8')
    expect(hook).toContain('loadDefaultIndex')
    expect(hook).toContain("'use client'")
  })

  it('rewrites @/lib and @/hooks imports to relative paths on scaffold', async () => {
    const cwd = await tempProjectWithConfigV2() // componentDir 'app/components', libDir 'lib', hooksDir 'hooks'
    await addComponents({ cwd, targets: ['autocomplete'], yes: true })
    const component = await readFile(path.join(cwd, 'app/components/thai-address-autocomplete.tsx'), 'utf8')
    expect(component).toContain("from '../../lib/utils'")
    expect(component).toContain("from '../../hooks/use-thai-address-index'")
    expect(component).not.toContain("'@/")
    expect(await pathExists(path.join(cwd, 'lib/utils.ts'))).toBe(true)
    expect(await pathExists(path.join(cwd, 'hooks/use-thai-address-index.ts'))).toBe(true)
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

// S1/S3: `add` joins config directories straight into a write path. A config
// value that climbs out of the project, or a symlink planted in a checked-out
// repo, must never let a scaffolded file land outside the project root.
describe('addComponents write-path containment', () => {
  const originalLog = console.log

  beforeEach(() => {
    console.log = vi.fn()
    mockedPrompts.mockReset()
    mockedInstallPackage.mockReset()
    mockedInstallPackage.mockResolvedValue(undefined)
  })

  afterEach(() => {
    console.log = originalLog
    vi.restoreAllMocks()
  })

  it('refuses a config whose libDir climbs out of the project', async () => {
    const cwd = await tempProjectWithConfigV2()
    const outside = await tempDir()
    const relativeToOutside = path.relative(cwd, outside)
    await writeFile(
      path.join(cwd, 'thaizip.config.json'),
      JSON.stringify({
        typescript: true,
        componentDir: 'app/components',
        libDir: relativeToOutside,
        hooksDir: 'hooks',
        packageManager: 'npm',
        tailwind: { version: 4, css: 'app/globals.css' },
        registryVersion: '0.1.0',
      }),
    )

    await expect(addComponents({ cwd, targets: ['autocomplete'] })).rejects.toThrow(/libDir/)
    await expect(readdir(outside)).resolves.toEqual([])
  })

  it('refuses to scaffold through a component directory that symlinks outside the project', async () => {
    const cwd = await tempProjectWithConfigV2()
    const outside = await tempDir()
    await mkdir(path.join(cwd, 'app'), { recursive: true })
    await symlink(outside, path.join(cwd, 'app/components'), 'dir')

    await expect(addComponents({ cwd, targets: ['widget'], registry: syntheticRegistry })).rejects.toThrow(
      /outside the project/i,
    )
    await expect(readdir(outside)).resolves.toEqual([])
  })

  it('refuses to write through a dangling symlink pointing outside the project', async () => {
    const cwd = await tempProjectWithConfigV2()
    const outside = await tempDir()
    await mkdir(path.join(cwd, 'lib'), { recursive: true })
    await symlink(path.join(outside, 'planted.ts'), path.join(cwd, 'lib/utils.ts'))

    await expect(addComponents({ cwd, targets: ['widget'], registry: syntheticRegistry })).rejects.toThrow(
      /outside the project/i,
    )
    await expect(pathExists(path.join(outside, 'planted.ts'))).resolves.toBe(false)
  })

  it('treats a dangling symlink at a lib destination as an existing file rather than writing through it', async () => {
    const cwd = await tempProjectWithConfigV2()
    await mkdir(path.join(cwd, 'lib'), { recursive: true })
    await mkdir(path.join(cwd, 'real'), { recursive: true })
    // Points inside the project, so containment passes — the only thing that
    // can stop the write is the never-overwrite guard for lib files, which
    // used to see access()'s "doesn't exist" and let the copy through.
    await symlink(path.join(cwd, 'real/planted.ts'), path.join(cwd, 'lib/utils.ts'))

    await addComponents({ cwd, targets: ['widget'], registry: syntheticRegistry })

    await expect(pathExists(path.join(cwd, 'real/planted.ts'))).resolves.toBe(false)
  })
})

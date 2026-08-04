import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import prompts from 'prompts'
import { addComponents } from '../src/commands/add.js'
import { writeConfig } from '../src/utils/config.js'
import { pathExists } from '../src/utils/fs.js'

vi.mock('prompts', () => ({
  default: vi.fn(),
}))

const mockedPrompts = vi.mocked(prompts)

async function tempDir() {
  return mkdtemp(path.join(os.tmpdir(), 'react-thaizip-'))
}

async function writeBaseProject(cwd: string, dependencies: Record<string, string> = { thaizip: '^0.7.0' }) {
  await writeFile(path.join(cwd, 'package.json'), JSON.stringify({ dependencies }))
  await writeConfig(
    {
      typescript: true,
      componentDir: 'components',
      libDir: 'lib',
      hooksDir: 'hooks',
      packageManager: 'npm',
      tailwind: { version: 4, css: '' },
      registryVersion: '0.1.0',
    },
    cwd,
  )
}

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
    const cwd = await tempDir()
    await writeBaseProject(cwd)
    mockedPrompts.mockResolvedValueOnce({ components: ['ThaiAddressCascadeSelect'] })

    await addComponents({ cwd, targets: [] })

    await expect(readFile(path.join(cwd, 'components', 'ThaiAddressCascadeSelect.tsx'), 'utf8')).resolves.toContain(
      'export function ThaiAddressCascadeSelect',
    )
  })

  it('skips existing files unless overwrite is confirmed', async () => {
    const cwd = await tempDir()
    await writeBaseProject(cwd)
    const destination = path.join(cwd, 'components', 'ThaiAddressAutocomplete.tsx')
    await mkdir(path.dirname(destination), { recursive: true })
    await writeFile(destination, 'existing content')
    mockedPrompts.mockResolvedValueOnce({ overwrite: false })

    await addComponents({ cwd, targets: ['autocomplete'] })

    await expect(readFile(destination, 'utf8')).resolves.toBe('existing content')
  })

  it('Autocomplete clear button uses ✕ not x', async () => {
    const cwd = await tempDir()
    await writeBaseProject(cwd)
    await addComponents({ cwd, targets: ['autocomplete'] })
    const content = await readFile(path.join(cwd, 'components', 'ThaiAddressAutocomplete.tsx'), 'utf8')
    expect(content).toContain('✕')
  })

  it('CascadeSelect uses English default labels and supports texts prop', async () => {
    const cwd = await tempDir()
    await writeBaseProject(cwd)
    await addComponents({ cwd, targets: ['ThaiAddressCascadeSelect'] })
    const content = await readFile(path.join(cwd, 'components', 'ThaiAddressCascadeSelect.tsx'), 'utf8')
    expect(content).toContain("provinceLabel: 'Province'")
    expect(content).toContain("districtLabel: 'District'")
    expect(content).toContain("subdistrictLabel: 'Sub District'")
    expect(content).toContain("postalCodeLabel: 'Postal Code'")
    expect(content).toContain('texts?: Partial<Texts>')
  })

  it('CascadeSelect uses htmlFor to associate labels with selects', async () => {
    const cwd = await tempDir()
    await writeBaseProject(cwd)
    await addComponents({ cwd, targets: ['ThaiAddressCascadeSelect'] })
    const content = await readFile(path.join(cwd, 'components', 'ThaiAddressCascadeSelect.tsx'), 'utf8')
    expect(content).toContain('htmlFor')
    expect(content).toContain('useId')
  })

  it('CascadeSelect accepts onClear prop and resets downstream selections', async () => {
    const cwd = await tempDir()
    await writeBaseProject(cwd)
    await addComponents({ cwd, targets: ['ThaiAddressCascadeSelect'] })
    const content = await readFile(path.join(cwd, 'components', 'ThaiAddressCascadeSelect.tsx'), 'utf8')
    expect(content).toContain('onClear')
    expect(content).toContain('onClear?.()')
  })

  it('blocks scaffolding and explains why when thaizip is declared below the version required for thaizip/react', async () => {
    const cwd = await tempDir()
    await writeBaseProject(cwd, { thaizip: '^0.4.0' })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    await addComponents({ cwd, targets: ['autocomplete'] })

    expect(process.exitCode).toBe(1)
    await expect(pathExists(path.join(cwd, 'components', 'ThaiAddressAutocomplete.tsx'))).resolves.toBe(false)
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('>=0.7.0'))
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('found 0.4.0'))
  })

  it('scaffolds normally when thaizip satisfies the required version', async () => {
    const cwd = await tempDir()
    await writeBaseProject(cwd, { thaizip: '^0.7.0' })

    await addComponents({ cwd, targets: ['autocomplete'] })

    await expect(pathExists(path.join(cwd, 'components', 'ThaiAddressAutocomplete.tsx'))).resolves.toBe(true)
  })

  it('prefers the version actually installed under node_modules over the declared range', async () => {
    const cwd = await tempDir()
    // package.json declares a satisfying range, but the version actually
    // resolved on disk is older — node_modules should win since that's
    // what will actually be imported at build time.
    await writeBaseProject(cwd, { thaizip: '^0.7.0' })
    await mkdir(path.join(cwd, 'node_modules', 'thaizip'), { recursive: true })
    await writeFile(path.join(cwd, 'node_modules', 'thaizip', 'package.json'), JSON.stringify({ version: '0.5.1' }))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    await addComponents({ cwd, targets: ['autocomplete'] })

    expect(process.exitCode).toBe(1)
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('found 0.5.1'))
  })
})

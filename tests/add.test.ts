import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import prompts from 'prompts'
import { addComponents } from '../src/commands/add.js'
import { writeConfig } from '../src/utils/config.js'

vi.mock('prompts', () => ({
  default: vi.fn(),
}))

const mockedPrompts = vi.mocked(prompts)

async function tempDir() {
  return mkdtemp(path.join(os.tmpdir(), 'react-thaizip-'))
}

async function writeBaseProject(cwd: string, typescript = true, dependencies: Record<string, string> = { thaizip: '^0.3.0' }) {
  await writeFile(path.join(cwd, 'package.json'), JSON.stringify({ dependencies }))
  await writeConfig(
    {
      typescript,
      componentDir: 'components',
      packageManager: 'npm',
      corePackage: {
        name: 'thaizip',
        version: '^0.3.0',
      },
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

  it('adds a TypeScript component from a legacy alias', async () => {
    const cwd = await tempDir()
    await writeBaseProject(cwd)

    await addComponents({ cwd, targets: ['ThaiAddressPostalForm'] })

    await expect(readFile(path.join(cwd, 'components', 'ThaiAddressPostalCodeForm.tsx'), 'utf8')).resolves.toContain(
      'export function ThaiAddressPostalCodeForm',
    )
  })

  it('adds DisplayFields with configurable display mode and order in TypeScript', async () => {
    const cwd = await tempDir()
    await writeBaseProject(cwd)

    await addComponents({ cwd, targets: ['fields'] })

    const content = await readFile(path.join(cwd, 'components', 'ThaiAddressDisplayFields.tsx'), 'utf8')
    expect(content).toContain("type DisplayField = 'subdistrict' | 'district' | 'province' | 'postalCode'")
    expect(content).toContain("type DisplayMode = 'fields' | 'inline'")
    expect(content).toContain("mode = 'fields'")
    expect(content).toContain("order = defaultOrder")
    expect(content).toContain("separator = ' > '")
    expect(content).toContain('formatInlineAddress')
  })

  it('adds a JavaScript component when configured for JS', async () => {
    const cwd = await tempDir()
    await writeBaseProject(cwd, false)

    await addComponents({ cwd, targets: ['ThaiAddressSearch'] })

    const content = await readFile(path.join(cwd, 'components', 'ThaiAddressDisplayFields.jsx'), 'utf8')
    expect(content).toContain('export function ThaiAddressDisplayFields')
    expect(content).toContain("mode = 'fields'")
    expect(content).toContain("order = defaultOrder")
    expect(content).toContain("separator = ' > '")
    expect(content).toContain('formatInlineAddress')
    expect(content).not.toContain('import type')
    expect(content).not.toContain('type DisplayField')
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

})

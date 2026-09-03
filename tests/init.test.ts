import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import prompts from 'prompts'
import { initProject } from '../src/commands/init.js'
import { getRegistryVersion } from '../src/utils/config.js'
import { pathExists } from '../src/utils/fs.js'
import { installPackage } from '../src/utils/install.js'

vi.mock('prompts', () => ({
  default: vi.fn(),
}))

vi.mock('../src/utils/install.js', () => ({
  installPackage: vi.fn().mockResolvedValue(undefined),
}))

const mockedPrompts = vi.mocked(prompts)
const mockedInstallPackage = vi.mocked(installPackage)

async function tempProject() {
  return mkdtemp(path.join(os.tmpdir(), 'react-thaizip-'))
}

describe('initProject', () => {
  const originalLog = console.log

  beforeEach(() => {
    console.log = vi.fn()
    mockedPrompts.mockReset()
    mockedInstallPackage.mockReset()
    mockedInstallPackage.mockResolvedValue(undefined)
  })

  afterEach(() => {
    console.log = originalLog
    process.exitCode = 0
    vi.restoreAllMocks()
  })

  it('creates config from detected project settings', async () => {
    const cwd = await tempProject()
    await mkdir(path.join(cwd, 'app'))
    await writeFile(path.join(cwd, 'tsconfig.json'), '{}')
    await writeFile(path.join(cwd, 'tailwind.config.ts'), '')
    await writeFile(path.join(cwd, 'package.json'), JSON.stringify({ dependencies: { thaizip: '^0.7.0' } }))
    mockedPrompts.mockResolvedValueOnce({})

    await initProject({ cwd })

    const config = JSON.parse(await readFile(path.join(cwd, 'thaizip.config.json'), 'utf8'))
    expect(config).toMatchObject({
      typescript: true,
      componentDir: 'app/components',
      libDir: 'lib',
      hooksDir: 'hooks',
      packageManager: 'npm',
      // No global CSS file matched the candidates, so cssPath stays null and
      // the config records an empty css path — only the config.ts (v3
      // marker) file drove detection here.
      tailwind: { version: 3, css: '' },
      // Derived, not pinned: a hardcoded version here silently rots on every release.
      registryVersion: await getRegistryVersion(),
    })
  })

  it('detects src/lib + src/hooks (not root lib/hooks) when the project has no app/ or pages/ directory', async () => {
    const cwd = await tempProject()
    await writeFile(path.join(cwd, 'tailwind.config.ts'), '')
    await writeFile(path.join(cwd, 'package.json'), JSON.stringify({ dependencies: { thaizip: '^0.7.0' } }))

    await initProject({ cwd, yes: true })

    const config = JSON.parse(await readFile(path.join(cwd, 'thaizip.config.json'), 'utf8'))
    expect(config.componentDir).toBe('src/components')
    expect(config.libDir).toBe('src/lib')
    expect(config.hooksDir).toBe('src/hooks')
  })

  it('exits without writing config when Tailwind is absent', async () => {
    const cwd = await tempProject() // no tailwind markers

    await initProject({ cwd, yes: true })

    expect(process.exitCode).toBe(1)
    process.exitCode = 0
    expect(await pathExists(path.join(cwd, 'thaizip.config.json'))).toBe(false)
  })

  it('writes a v2 config and appends tokens on a v4 project with --yes', async () => {
    const cwd = await tempProject()
    await mkdir(path.join(cwd, 'app'), { recursive: true })
    await writeFile(path.join(cwd, 'app/globals.css'), '@import "tailwindcss";\n')
    await writeFile(path.join(cwd, 'package.json'), JSON.stringify({ dependencies: { thaizip: '^0.7.0' } }))

    await initProject({ cwd, yes: true })

    const config = JSON.parse(await readFile(path.join(cwd, 'thaizip.config.json'), 'utf8'))
    expect(config.tailwind).toEqual({ version: 4, css: 'app/globals.css' })
    expect(config.libDir).toBe('lib')
    expect(await readFile(path.join(cwd, 'app/globals.css'), 'utf8')).toContain('react-thaizip design tokens')
  })

  it('exits 1 with a manual install hint when the thaizip install fails, without an unhandled rejection', async () => {
    const cwd = await tempProject()
    await mkdir(path.join(cwd, 'app'), { recursive: true })
    await writeFile(path.join(cwd, 'app/globals.css'), '@import "tailwindcss";\n')
    await writeFile(path.join(cwd, 'package.json'), JSON.stringify({ dependencies: {} }))
    mockedInstallPackage.mockRejectedValueOnce(new Error('registry down'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(initProject({ cwd, yes: true })).resolves.toBeUndefined()

    expect(process.exitCode).toBe(1)
    const logged = consoleError.mock.calls.map((call) => call.join(' ')).join('\n')
    expect(logged).toContain('thaizip@>=0.7.0')
    expect(await pathExists(path.join(cwd, 'thaizip.config.json'))).toBe(false)
    consoleError.mockRestore()
  })

  it('prints a detection summary — component dir, package manager, Tailwind version + CSS path — before prompting', async () => {
    const cwd = await tempProject()
    await mkdir(path.join(cwd, 'app'), { recursive: true })
    await writeFile(path.join(cwd, 'app/globals.css'), '@import "tailwindcss";\n')
    await writeFile(path.join(cwd, 'package-lock.json'), '{}')
    await writeFile(path.join(cwd, 'package.json'), JSON.stringify({ dependencies: { thaizip: '^0.7.0' } }))
    mockedPrompts.mockResolvedValueOnce({})

    await initProject({ cwd })

    const logCalls = (console.log as ReturnType<typeof vi.fn>).mock
    const logged = logCalls.calls.map((call) => call.join(' ')).join('\n')

    // The guessed settings are surfaced so the user can confirm them.
    expect(logged).toContain('app/components')
    expect(logged).toContain('npm')
    expect(logged).toContain('v4')
    expect(logged).toContain('app/globals.css')

    // The summary must print BEFORE the componentDir prompt is shown, so the
    // user can see the guesses before answering it — not after.
    const summaryCallIndex = logCalls.calls.findIndex((call) => call.join(' ').includes('app/components'))
    expect(summaryCallIndex).toBeGreaterThanOrEqual(0)
    expect(logCalls.invocationCallOrder[summaryCallIndex]).toBeLessThan(mockedPrompts.mock.invocationCallOrder[0])
  })

  it('aborts before any prompts when Tailwind is missing', async () => {
    const cwd = await tempProject() // no tailwind markers

    await initProject({ cwd, yes: false })

    expect(process.exitCode).toBe(1)
    process.exitCode = 0
    expect(mockedPrompts).not.toHaveBeenCalled()
  })

  it('defers the Tailwind v3 theme.extend snippet to the end of the run, after install and the config-created message', async () => {
    const cwd = await tempProject()
    await mkdir(path.join(cwd, 'app'), { recursive: true })
    await writeFile(path.join(cwd, 'tailwind.config.ts'), '')
    await writeFile(path.join(cwd, 'app/globals.css'), '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n')
    await writeFile(path.join(cwd, 'package.json'), JSON.stringify({ dependencies: { thaizip: '^0.7.0' } }))

    await initProject({ cwd, yes: true })

    const logCalls = (console.log as ReturnType<typeof vi.fn>).mock.calls
    const joined = logCalls.map((call) => call.join(' '))
    const fullLog = joined.join('\n')

    // Printed exactly once.
    expect(fullLog.match(/theme\.extend/g)).toHaveLength(1)

    const createdIndex = joined.findIndex((line) => line.includes('Created thaizip.config.json.'))
    const snippetIndex = joined.findIndex((line) => line.includes('theme.extend'))
    expect(createdIndex).toBeGreaterThanOrEqual(0)
    expect(snippetIndex).toBeGreaterThan(createdIndex)

    // Called out under an unmissable heading.
    expect(fullLog).toContain('Manual steps required')
  })

  it('defers the "no global CSS file found" token block to the end of the run when no CSS file is found', async () => {
    const cwd = await tempProject()
    await mkdir(path.join(cwd, 'app'), { recursive: true })
    await writeFile(path.join(cwd, 'tailwind.config.ts'), '')
    await writeFile(path.join(cwd, 'package.json'), JSON.stringify({ dependencies: { thaizip: '^0.7.0' } }))

    await initProject({ cwd, yes: true })

    const logCalls = (console.log as ReturnType<typeof vi.fn>).mock.calls
    const joined = logCalls.map((call) => call.join(' '))
    const fullLog = joined.join('\n')

    expect(fullLog.match(/No global CSS file was found/g)).toHaveLength(1)
    expect(fullLog).toContain('--background')
    expect(fullLog).toContain('Manual steps required')

    const createdIndex = joined.findIndex((line) => line.includes('Created thaizip.config.json.'))
    const manualIndex = joined.findIndex((line) => line.includes('No global CSS file was found'))
    expect(createdIndex).toBeGreaterThanOrEqual(0)
    expect(manualIndex).toBeGreaterThan(createdIndex)
  })

  it('ends a successful run with the next command to run', async () => {
    const cwd = await tempProject()
    await mkdir(path.join(cwd, 'app'), { recursive: true })
    await writeFile(path.join(cwd, 'app/globals.css'), '@import "tailwindcss";\n')
    await writeFile(path.join(cwd, 'package.json'), JSON.stringify({ dependencies: { thaizip: '^0.7.0' } }))

    await initProject({ cwd, yes: true })

    const logCalls = (console.log as ReturnType<typeof vi.fn>).mock.calls
    const joined = logCalls.map((call) => call.join(' '))
    const createdIndex = joined.findIndex((line) => line.includes('Created thaizip.config.json.'))
    const nextStepIndex = joined.findIndex((line) => line.includes('npx react-thaizip add autocomplete'))

    expect(nextStepIndex).toBeGreaterThan(createdIndex)
  })

  it('detects TypeScript when tsconfig.json is present and writes typescript: true to config', async () => {
    const cwd = await tempProject()
    await mkdir(path.join(cwd, 'app'), { recursive: true })
    await writeFile(path.join(cwd, 'tsconfig.json'), '{}')
    await writeFile(path.join(cwd, 'app/globals.css'), '@import "tailwindcss";\n')
    await writeFile(path.join(cwd, 'package.json'), JSON.stringify({ dependencies: { thaizip: '^0.7.0' } }))

    await initProject({ cwd, yes: true })

    const config = JSON.parse(await readFile(path.join(cwd, 'thaizip.config.json'), 'utf8'))
    expect(config.typescript).toBe(true)
  })

  it('detects JavaScript when tsconfig.json is absent and writes typescript: false to config', async () => {
    const cwd = await tempProject()
    await mkdir(path.join(cwd, 'app'), { recursive: true })
    await writeFile(path.join(cwd, 'app/globals.css'), '@import "tailwindcss";\n')
    await writeFile(path.join(cwd, 'package.json'), JSON.stringify({ dependencies: { thaizip: '^0.7.0' } }))

    await initProject({ cwd, yes: true })

    const config = JSON.parse(await readFile(path.join(cwd, 'thaizip.config.json'), 'utf8'))
    expect(config.typescript).toBe(false)
  })

  it('includes TypeScript in the detection summary when tsconfig.json is present', async () => {
    const cwd = await tempProject()
    await mkdir(path.join(cwd, 'app'), { recursive: true })
    await writeFile(path.join(cwd, 'tsconfig.json'), '{}')
    await writeFile(path.join(cwd, 'app/globals.css'), '@import "tailwindcss";\n')
    await writeFile(path.join(cwd, 'package.json'), JSON.stringify({ dependencies: { thaizip: '^0.7.0' } }))
    mockedPrompts.mockResolvedValueOnce({})

    await initProject({ cwd })

    const logCalls = (console.log as ReturnType<typeof vi.fn>).mock
    const logged = logCalls.calls.map((call) => call.join(' ')).join('\n')

    expect(logged).toContain('Language: TypeScript')
  })

  it('includes JavaScript in the detection summary when tsconfig.json is absent', async () => {
    const cwd = await tempProject()
    await mkdir(path.join(cwd, 'app'), { recursive: true })
    await writeFile(path.join(cwd, 'app/globals.css'), '@import "tailwindcss";\n')
    await writeFile(path.join(cwd, 'package.json'), JSON.stringify({ dependencies: { thaizip: '^0.7.0' } }))
    mockedPrompts.mockResolvedValueOnce({})

    await initProject({ cwd })

    const logCalls = (console.log as ReturnType<typeof vi.fn>).mock
    const logged = logCalls.calls.map((call) => call.join(' ')).join('\n')

    expect(logged).toContain('Language: JavaScript')
  })

  it('prints the Language line in the detection summary before the componentDir prompt', async () => {
    const cwd = await tempProject()
    await mkdir(path.join(cwd, 'app'), { recursive: true })
    await writeFile(path.join(cwd, 'tsconfig.json'), '{}')
    await writeFile(path.join(cwd, 'app/globals.css'), '@import "tailwindcss";\n')
    await writeFile(path.join(cwd, 'package-lock.json'), '{}')
    await writeFile(path.join(cwd, 'package.json'), JSON.stringify({ dependencies: { thaizip: '^0.7.0' } }))
    mockedPrompts.mockResolvedValueOnce({})

    await initProject({ cwd })

    const logCalls = (console.log as ReturnType<typeof vi.fn>).mock
    const languageCallIndex = logCalls.calls.findIndex((call) => call.join(' ').includes('Language:'))
    expect(languageCallIndex).toBeGreaterThanOrEqual(0)
    expect(logCalls.invocationCallOrder[languageCallIndex]).toBeLessThan(mockedPrompts.mock.invocationCallOrder[0])
  })
})

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
})

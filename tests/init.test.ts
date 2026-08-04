import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import prompts from 'prompts'
import { initProject } from '../src/commands/init.js'
import { getRegistryVersion } from '../src/utils/config.js'

vi.mock('prompts', () => ({
  default: vi.fn(),
}))

const mockedPrompts = vi.mocked(prompts)

async function tempDir() {
  return mkdtemp(path.join(os.tmpdir(), 'react-thaizip-'))
}

describe('initProject', () => {
  const originalLog = console.log

  beforeEach(() => {
    console.log = vi.fn()
    mockedPrompts.mockReset()
  })

  afterEach(() => {
    console.log = originalLog
    vi.restoreAllMocks()
  })

  it('creates config from detected project settings', async () => {
    const cwd = await tempDir()
    await mkdir(path.join(cwd, 'app'))
    await writeFile(path.join(cwd, 'tsconfig.json'), '{}')
    await writeFile(path.join(cwd, 'tailwind.config.ts'), '')
    await writeFile(path.join(cwd, 'package.json'), JSON.stringify({ dependencies: { thaizip: '^0.6.0' } }))
    mockedPrompts.mockResolvedValueOnce({})

    await initProject({ cwd })

    const config = JSON.parse(await readFile(path.join(cwd, 'thaizip.config.json'), 'utf8'))
    expect(config).toMatchObject({
      typescript: true,
      componentDir: 'app/components',
      libDir: 'lib',
      hooksDir: 'hooks',
      packageManager: 'npm',
      tailwind: { version: 4, css: '' },
      // Derived, not pinned: a hardcoded version here silently rots on every release.
      registryVersion: await getRegistryVersion(),
    })
  })

  it('warns when Tailwind is not detected', async () => {
    const cwd = await tempDir()
    await writeFile(path.join(cwd, 'package.json'), JSON.stringify({ dependencies: { thaizip: '^0.6.0' } }))
    mockedPrompts.mockResolvedValueOnce({})
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await initProject({ cwd })

    expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining('Tailwind CSS was not detected'))
  })
})

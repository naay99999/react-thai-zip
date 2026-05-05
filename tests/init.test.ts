import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import prompts from 'prompts'
import { initProject } from '../src/commands/init.js'

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
    await writeFile(path.join(cwd, 'package.json'), JSON.stringify({ dependencies: { thaizip: '^0.4.0' } }))
    mockedPrompts.mockResolvedValueOnce({})

    await initProject({ cwd })

    const config = JSON.parse(await readFile(path.join(cwd, 'thaizip.config.json'), 'utf8'))
    expect(config).toMatchObject({
      typescript: true,
      componentDir: 'app/components',
      packageManager: 'npm',
      corePackage: {
        name: 'thaizip',
        version: '^0.4.0',
      },
      registryVersion: '0.1.1',
    })
  })

  it('asks for TypeScript preference when language is unknown', async () => {
    const cwd = await tempDir()
    await writeFile(path.join(cwd, 'tailwind.config.ts'), '')
    await writeFile(path.join(cwd, 'package.json'), JSON.stringify({ dependencies: { thaizip: '^0.4.0' } }))
    mockedPrompts.mockResolvedValueOnce({ typescript: false }).mockResolvedValueOnce({})

    await initProject({ cwd })

    const config = JSON.parse(await readFile(path.join(cwd, 'thaizip.config.json'), 'utf8'))
    expect(config.typescript).toBe(false)
    expect(mockedPrompts).toHaveBeenCalledWith(expect.objectContaining({ name: 'typescript' }))
  })
})

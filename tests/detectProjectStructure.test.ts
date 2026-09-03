import { mkdir, mkdtemp } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { detectProjectStructure } from '../src/utils/detectProjectStructure.js'

async function tempDir() {
  return mkdtemp(path.join(os.tmpdir(), 'react-thaizip-'))
}

describe('detectProjectStructure', () => {
  it('uses app/components + root lib/hooks for App Router projects', async () => {
    const cwd = await tempDir()
    await mkdir(path.join(cwd, 'app'))
    const result = await detectProjectStructure(cwd)
    expect(result.directory).toBe(path.join(cwd, 'app', 'components'))
    expect(result.libDir).toBe(path.join(cwd, 'lib'))
    expect(result.hooksDir).toBe(path.join(cwd, 'hooks'))
  })

  it('uses components + root lib/hooks for Pages Router projects', async () => {
    const cwd = await tempDir()
    await mkdir(path.join(cwd, 'pages'))
    const result = await detectProjectStructure(cwd)
    expect(result.directory).toBe(path.join(cwd, 'components'))
    expect(result.libDir).toBe(path.join(cwd, 'lib'))
    expect(result.hooksDir).toBe(path.join(cwd, 'hooks'))
  })

  it('uses src/components + src/lib + src/hooks as fallback', async () => {
    const cwd = await tempDir()
    const result = await detectProjectStructure(cwd)
    expect(result.directory).toBe(path.join(cwd, 'src', 'components'))
    expect(result.libDir).toBe(path.join(cwd, 'src', 'lib'))
    expect(result.hooksDir).toBe(path.join(cwd, 'src', 'hooks'))
  })
})

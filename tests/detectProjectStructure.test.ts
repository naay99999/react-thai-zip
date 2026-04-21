import { mkdir, mkdtemp } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { detectProjectStructure } from '../src/utils/detectProjectStructure.js'

async function tempDir() {
  return mkdtemp(path.join(os.tmpdir(), 'react-thaizip-'))
}

describe('detectProjectStructure', () => {
  it('uses app/components for App Router projects', async () => {
    const cwd = await tempDir()
    await mkdir(path.join(cwd, 'app'))
    const result = await detectProjectStructure(cwd)
    expect(result.structure).toBe('app-router')
    expect(result.filePath).toBe(path.join(cwd, 'app', 'components', 'ThaiAddressAutocomplete.tsx'))
  })

  it('uses components for Pages Router projects', async () => {
    const cwd = await tempDir()
    await mkdir(path.join(cwd, 'pages'))
    const result = await detectProjectStructure(cwd)
    expect(result.structure).toBe('pages-router')
    expect(result.filePath).toBe(path.join(cwd, 'components', 'ThaiAddressAutocomplete.tsx'))
  })

  it('uses src/components as fallback', async () => {
    const cwd = await tempDir()
    const result = await detectProjectStructure(cwd)
    expect(result.structure).toBe('fallback')
    expect(result.filePath).toBe(path.join(cwd, 'src', 'components', 'ThaiAddressAutocomplete.tsx'))
  })
})

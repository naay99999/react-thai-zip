import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { copyTemplate } from '../src/utils/copyTemplate.js'

async function tempDir() {
  return mkdtemp(path.join(os.tmpdir(), 'react-thaizip-'))
}

describe('copyTemplate', () => {
  it('does not overwrite existing files unless overwrite is true', async () => {
    const cwd = await tempDir()
    const source = path.join(cwd, 'template.tsx')
    const destination = path.join(cwd, 'components', 'ThaiAddressAutocomplete.tsx')

    await writeFile(source, 'new content')
    await mkdir(path.dirname(destination), { recursive: true })
    await writeFile(destination, 'existing content')

    const result = await copyTemplate({ destination, templatePath: source, overwrite: false })

    await expect(readFile(destination, 'utf8')).resolves.toBe('existing content')
    expect(result).toBe('skipped')
  })

  it('overwrites existing files when overwrite is true', async () => {
    const cwd = await tempDir()
    const source = path.join(cwd, 'template.tsx')
    const destination = path.join(cwd, 'components', 'ThaiAddressAutocomplete.tsx')

    await writeFile(source, 'new content')
    await mkdir(path.dirname(destination), { recursive: true })
    await writeFile(destination, 'existing content')

    const result = await copyTemplate({ destination, templatePath: source, overwrite: true })

    await expect(readFile(destination, 'utf8')).resolves.toBe('new content')
    expect(result).toBe('copied')
  })
})

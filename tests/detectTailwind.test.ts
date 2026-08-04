import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { detectTailwind } from '../src/utils/detectTailwind.js'

async function tempProject(): Promise<string> {
  return mkdtemp(path.join(tmpdir(), 'thaizip-tw-'))
}

describe('detectTailwind', () => {
  it('detects v4 from @import "tailwindcss" in a known global css', async () => {
    const cwd = await tempProject()
    await mkdir(path.join(cwd, 'app'), { recursive: true })
    await writeFile(path.join(cwd, 'app/globals.css'), '@import "tailwindcss";\n')
    expect(await detectTailwind(cwd)).toEqual({ version: 4, cssPath: 'app/globals.css' })
  })

  it('detects v4 from the package.json dependency range when no css matches', async () => {
    const cwd = await tempProject()
    await writeFile(path.join(cwd, 'package.json'), JSON.stringify({ dependencies: { tailwindcss: '^4.1.0' } }))
    expect(await detectTailwind(cwd)).toEqual({ version: 4, cssPath: null })
  })

  it('detects v3 from a config file and finds the @tailwind css', async () => {
    const cwd = await tempProject()
    await writeFile(path.join(cwd, 'tailwind.config.js'), 'module.exports = {}\n')
    await mkdir(path.join(cwd, 'src'), { recursive: true })
    await writeFile(path.join(cwd, 'src/index.css'), '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n')
    expect(await detectTailwind(cwd)).toEqual({ version: 3, cssPath: 'src/index.css' })
  })

  it('returns null when Tailwind is absent', async () => {
    const cwd = await tempProject()
    expect(await detectTailwind(cwd)).toBeNull()
  })
})

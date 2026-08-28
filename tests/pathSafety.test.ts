import { mkdir, mkdtemp, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { assertPathInsideRoot, assertRealPathInsideRoot, isPathInsideRoot } from '../src/utils/pathSafety.js'

async function tempDir() {
  return mkdtemp(path.join(os.tmpdir(), 'react-thaizip-pathsafety-'))
}

describe('isPathInsideRoot', () => {
  it('accepts a path nested under the root', () => {
    expect(isPathInsideRoot('/p/app/components/Widget.tsx', '/p')).toBe(true)
  })

  it('rejects a path that climbs out of the root with ..', () => {
    expect(isPathInsideRoot('/p/../../tmp/pwned/utils.ts', '/p')).toBe(false)
  })

  it('rejects the root itself (a file destination is never the root)', () => {
    expect(isPathInsideRoot('/p', '/p')).toBe(false)
  })

  it('rejects a sibling directory sharing the root name prefix', () => {
    expect(isPathInsideRoot('/p-evil/utils.ts', '/p')).toBe(false)
  })
})

describe('assertPathInsideRoot', () => {
  it('throws naming the offending path when the destination escapes the root', () => {
    expect(() => assertPathInsideRoot('/p/../../tmp/pwned/utils.ts', '/p')).toThrow(/outside the project/i)
  })

  it('does not throw for a destination inside the root', () => {
    expect(() => assertPathInsideRoot('/p/lib/utils.ts', '/p')).not.toThrow()
  })
})

describe('assertRealPathInsideRoot', () => {
  it('accepts a destination whose parent directories do not exist yet', async () => {
    const root = await tempDir()
    await expect(assertRealPathInsideRoot(path.join(root, 'app/components/Widget.tsx'), root)).resolves.toBeUndefined()
  })

  it('rejects a destination reached through a directory symlink pointing outside the root', async () => {
    const root = await tempDir()
    const outside = await tempDir()
    await mkdir(path.join(root, 'app'), { recursive: true })
    await symlink(outside, path.join(root, 'app/components'), 'dir')

    await expect(assertRealPathInsideRoot(path.join(root, 'app/components/Widget.tsx'), root)).rejects.toThrow(
      /outside the project/i,
    )
  })

  it('rejects a destination that is itself a symlink to a file outside the root', async () => {
    const root = await tempDir()
    const outside = await tempDir()
    const outsideFile = path.join(outside, 'target.ts')
    await writeFile(outsideFile, 'victim')
    await mkdir(path.join(root, 'lib'), { recursive: true })
    await symlink(outsideFile, path.join(root, 'lib/utils.ts'))

    await expect(assertRealPathInsideRoot(path.join(root, 'lib/utils.ts'), root)).rejects.toThrow(/outside the project/i)
  })

  it('rejects a destination that is a dangling symlink pointing outside the root', async () => {
    const root = await tempDir()
    const outside = await tempDir()
    await mkdir(path.join(root, 'lib'), { recursive: true })
    await symlink(path.join(outside, 'not-created-yet.ts'), path.join(root, 'lib/utils.ts'))

    await expect(assertRealPathInsideRoot(path.join(root, 'lib/utils.ts'), root)).rejects.toThrow(/outside the project/i)
  })

  it('accepts a symlink that stays inside the root', async () => {
    const root = await tempDir()
    await mkdir(path.join(root, 'lib'), { recursive: true })
    await mkdir(path.join(root, 'real'), { recursive: true })
    await writeFile(path.join(root, 'real/utils.ts'), 'ok')
    await symlink(path.join(root, 'real/utils.ts'), path.join(root, 'lib/utils.ts'))

    await expect(assertRealPathInsideRoot(path.join(root, 'lib/utils.ts'), root)).resolves.toBeUndefined()
  })
})

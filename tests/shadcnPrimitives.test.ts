import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { runPackageManagerDlx } from '../src/utils/install.js'
import { ensureShadcnPrimitives } from '../src/utils/shadcnPrimitives.js'

vi.mock('../src/utils/install.js', () => ({
  runPackageManagerDlx: vi.fn().mockResolvedValue(undefined),
}))

const mockedDlx = vi.mocked(runPackageManagerDlx)

async function tempDir() {
  return mkdtemp(path.join(os.tmpdir(), 'react-thaizip-shadcn-primitives-'))
}

describe('ensureShadcnPrimitives', () => {
  it('does nothing and never execs when every primitive already exists', async () => {
    const cwd = await tempDir()
    await mkdir(path.join(cwd, 'components', 'ui'), { recursive: true })
    await writeFile(path.join(cwd, 'components', 'ui', 'select.tsx'), '')
    await writeFile(path.join(cwd, 'components', 'ui', 'label.tsx'), '')

    mockedDlx.mockClear()
    await ensureShadcnPrimitives(['select', 'label'], { cwd, pm: 'npm', uiDir: 'components/ui', yes: true, typescript: true })

    expect(mockedDlx).not.toHaveBeenCalled()
  })

  it('execs only the missing primitives, passing -y when yes is true, via runPackageManagerDlx', async () => {
    const cwd = await tempDir()
    await mkdir(path.join(cwd, 'components', 'ui'), { recursive: true })
    await writeFile(path.join(cwd, 'components', 'ui', 'select.tsx'), '')

    mockedDlx.mockClear()
    await ensureShadcnPrimitives(['select', 'label', 'button'], { cwd, pm: 'npm', uiDir: 'components/ui', yes: true, typescript: true })

    expect(mockedDlx).toHaveBeenCalledTimes(1)
    expect(mockedDlx).toHaveBeenCalledWith(
      ['shadcn@latest', 'add', 'label', 'button', '-y'],
      { cwd, pm: 'npm' },
    )
  })

  it('omits -y when yes is false, letting the shadcn CLI prompt', async () => {
    const cwd = await tempDir()

    mockedDlx.mockClear()
    await ensureShadcnPrimitives(['popover'], { cwd, pm: 'pnpm', uiDir: 'src/components/ui', yes: false, typescript: true })

    expect(mockedDlx).toHaveBeenCalledWith(['shadcn@latest', 'add', 'popover'], { cwd, pm: 'pnpm' })
  })

  it('goes through runPackageManagerDlx (not a local-bin exec) for npm', async () => {
    const cwd = await tempDir()

    mockedDlx.mockClear()
    await ensureShadcnPrimitives(['input'], { cwd, pm: 'npm', uiDir: 'components/ui', yes: true, typescript: true })

    expect(mockedDlx).toHaveBeenCalledWith(['shadcn@latest', 'add', 'input', '-y'], { cwd, pm: 'npm' })
  })

  it('goes through runPackageManagerDlx (not a local-bin exec) for pnpm', async () => {
    const cwd = await tempDir()

    mockedDlx.mockClear()
    await ensureShadcnPrimitives(['input'], { cwd, pm: 'pnpm', uiDir: 'components/ui', yes: true, typescript: true })

    expect(mockedDlx).toHaveBeenCalledWith(['shadcn@latest', 'add', 'input', '-y'], { cwd, pm: 'pnpm' })
  })

  it('treats a dangling symlink at the expected path as present (no exec) — same never-follow rule as add.ts', async () => {
    const cwd = await tempDir()
    await mkdir(path.join(cwd, 'components', 'ui'), { recursive: true })
    const { symlink } = await import('node:fs/promises')
    await symlink(path.join(cwd, 'nowhere.tsx'), path.join(cwd, 'components', 'ui', 'command.tsx'))

    mockedDlx.mockClear()
    await ensureShadcnPrimitives(['command'], { cwd, pm: 'npm', uiDir: 'components/ui', yes: true, typescript: true })

    expect(mockedDlx).not.toHaveBeenCalled()
  })

  describe('typescript option controls the existence-check extension', () => {
    it('checks for .tsx when typescript is true, ignoring an existing .jsx file', async () => {
      const cwd = await tempDir()
      await mkdir(path.join(cwd, 'components', 'ui'), { recursive: true })
      // Only the .jsx file exists — under typescript: true this must still
      // count as "missing" because the project expects a .tsx primitive.
      await writeFile(path.join(cwd, 'components', 'ui', 'select.jsx'), '')

      mockedDlx.mockClear()
      await ensureShadcnPrimitives(['select'], { cwd, pm: 'npm', uiDir: 'components/ui', yes: true, typescript: true })

      expect(mockedDlx).toHaveBeenCalledWith(['shadcn@latest', 'add', 'select', '-y'], { cwd, pm: 'npm' })
    })

    it('checks for .jsx when typescript is false, recognizing an existing .jsx file as present', async () => {
      const cwd = await tempDir()
      await mkdir(path.join(cwd, 'components', 'ui'), { recursive: true })
      await writeFile(path.join(cwd, 'components', 'ui', 'select.jsx'), '')

      mockedDlx.mockClear()
      await ensureShadcnPrimitives(['select'], { cwd, pm: 'npm', uiDir: 'components/ui', yes: true, typescript: false })

      expect(mockedDlx).not.toHaveBeenCalled()
    })

    it('under typescript: false, a genuinely missing primitive is checked for at the .jsx path, not .tsx', async () => {
      const cwd = await tempDir()
      await mkdir(path.join(cwd, 'components', 'ui'), { recursive: true })
      // Only a .tsx file exists (e.g. leftover from a prior TS-target run) —
      // under typescript: false this must not count as present, since the
      // project now expects .jsx.
      await writeFile(path.join(cwd, 'components', 'ui', 'select.tsx'), '')

      mockedDlx.mockClear()
      await ensureShadcnPrimitives(['select'], { cwd, pm: 'npm', uiDir: 'components/ui', yes: true, typescript: false })

      expect(mockedDlx).toHaveBeenCalledWith(['shadcn@latest', 'add', 'select', '-y'], { cwd, pm: 'npm' })
    })
  })
})

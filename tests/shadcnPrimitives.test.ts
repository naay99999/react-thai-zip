import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { runPackageManagerExec } from '../src/utils/install.js'
import { ensureShadcnPrimitives } from '../src/utils/shadcnPrimitives.js'

vi.mock('../src/utils/install.js', () => ({
  runPackageManagerExec: vi.fn().mockResolvedValue(undefined),
}))

const mockedExec = vi.mocked(runPackageManagerExec)

async function tempDir() {
  return mkdtemp(path.join(os.tmpdir(), 'react-thaizip-shadcn-primitives-'))
}

describe('ensureShadcnPrimitives', () => {
  it('does nothing and never execs when every primitive already exists', async () => {
    const cwd = await tempDir()
    await mkdir(path.join(cwd, 'components', 'ui'), { recursive: true })
    await writeFile(path.join(cwd, 'components', 'ui', 'select.tsx'), '')
    await writeFile(path.join(cwd, 'components', 'ui', 'label.tsx'), '')

    mockedExec.mockClear()
    await ensureShadcnPrimitives(['select', 'label'], { cwd, pm: 'npm', uiDir: 'components/ui', yes: true })

    expect(mockedExec).not.toHaveBeenCalled()
  })

  it('execs only the missing primitives, passing -y when yes is true', async () => {
    const cwd = await tempDir()
    await mkdir(path.join(cwd, 'components', 'ui'), { recursive: true })
    await writeFile(path.join(cwd, 'components', 'ui', 'select.tsx'), '')

    mockedExec.mockClear()
    await ensureShadcnPrimitives(['select', 'label', 'button'], { cwd, pm: 'npm', uiDir: 'components/ui', yes: true })

    expect(mockedExec).toHaveBeenCalledTimes(1)
    expect(mockedExec).toHaveBeenCalledWith(
      ['shadcn@latest', 'add', 'label', 'button', '-y'],
      { cwd, pm: 'npm' },
    )
  })

  it('omits -y when yes is false, letting the shadcn CLI prompt', async () => {
    const cwd = await tempDir()

    mockedExec.mockClear()
    await ensureShadcnPrimitives(['popover'], { cwd, pm: 'pnpm', uiDir: 'src/components/ui', yes: false })

    expect(mockedExec).toHaveBeenCalledWith(['shadcn@latest', 'add', 'popover'], { cwd, pm: 'pnpm' })
  })

  it('treats a dangling symlink at the expected path as present (no exec) — same never-follow rule as add.ts', async () => {
    const cwd = await tempDir()
    await mkdir(path.join(cwd, 'components', 'ui'), { recursive: true })
    const { symlink } = await import('node:fs/promises')
    await symlink(path.join(cwd, 'nowhere.tsx'), path.join(cwd, 'components', 'ui', 'command.tsx'))

    mockedExec.mockClear()
    await ensureShadcnPrimitives(['command'], { cwd, pm: 'npm', uiDir: 'components/ui', yes: true })

    expect(mockedExec).not.toHaveBeenCalled()
  })
})

// Exercises the JS-target x shadcn-style combination end-to-end through the
// real addComponents -> real ensureShadcnPrimitives pipeline (unlike
// tests/add.test.ts, which mocks ensureShadcnPrimitives entirely). Only the
// remote-fetch boundary (runPackageManagerDlx) is mocked, so this genuinely
// proves the existence check in shadcnPrimitives.ts looks at .jsx — not just
// that add.ts passes a typescript flag through to a mock. This is exactly the
// combination that let the .tsx-hardcoded bug through review undetected.
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { addComponents } from '../src/commands/add.js'
import { writeConfig } from '../src/utils/config.js'
import { runPackageManagerDlx } from '../src/utils/install.js'

vi.mock('../src/utils/install.js', () => ({
  installPackage: vi.fn().mockResolvedValue(undefined),
  runPackageManagerDlx: vi.fn().mockResolvedValue(undefined),
}))

const mockedDlx = vi.mocked(runPackageManagerDlx)

async function tempDir() {
  return mkdtemp(path.join(os.tmpdir(), 'react-thaizip-shadcn-js-'))
}

async function tempShadcnJsProject() {
  const cwd = await tempDir()
  await writeFile(
    path.join(cwd, 'package.json'),
    JSON.stringify({ dependencies: { thaizip: '^0.7.0' } }),
  )
  await writeConfig(
    {
      typescript: false,
      componentDir: 'app/components',
      libDir: 'lib',
      hooksDir: 'hooks',
      packageManager: 'npm',
      tailwind: { version: 4, css: 'app/globals.css' },
      style: 'shadcn',
      shadcnUiAlias: '@/components/ui',
      shadcnUiDir: 'components/ui',
      registryVersion: '0.1.0',
    },
    cwd,
  )
  return cwd
}

describe('addComponents — shadcn style x JS-target, end-to-end through the real ensureShadcnPrimitives', () => {
  beforeEach(() => {
    mockedDlx.mockClear()
  })

  it('recognizes existing .jsx primitive files as present and never calls the dlx fetch', async () => {
    const cwd = await tempShadcnJsProject()
    await mkdir(path.join(cwd, 'components/ui'), { recursive: true })
    for (const name of ['popover', 'command', 'button']) {
      await writeFile(path.join(cwd, 'components/ui', `${name}.jsx`), '')
    }

    await addComponents({ cwd, targets: ['autocomplete'], yes: true })

    expect(mockedDlx).not.toHaveBeenCalled()
  })

  it('checks a genuinely-missing primitive at the .jsx path (not .tsx) and fetches only that one', async () => {
    const cwd = await tempShadcnJsProject()
    await mkdir(path.join(cwd, 'components/ui'), { recursive: true })
    // popover/command exist as .jsx; button is missing entirely. A stray
    // .tsx file for button must NOT be mistaken for it being present under a
    // JS-target config, and must not be mistaken for satisfying it either.
    await writeFile(path.join(cwd, 'components/ui', 'popover.jsx'), '')
    await writeFile(path.join(cwd, 'components/ui', 'command.jsx'), '')

    await addComponents({ cwd, targets: ['autocomplete'], yes: true })

    expect(mockedDlx).toHaveBeenCalledTimes(1)
    expect(mockedDlx).toHaveBeenCalledWith(['shadcn@latest', 'add', 'button', '-y'], { cwd, pm: 'npm' })
  })

  it('a .tsx primitive file left over from a prior TS-target run does not count as present under typescript: false', async () => {
    const cwd = await tempShadcnJsProject()
    await mkdir(path.join(cwd, 'components/ui'), { recursive: true })
    for (const name of ['popover', 'command', 'button']) {
      // All three exist, but only as .tsx — wrong extension for this JS-target project.
      await writeFile(path.join(cwd, 'components/ui', `${name}.tsx`), '')
    }

    await addComponents({ cwd, targets: ['autocomplete'], yes: true })

    expect(mockedDlx).toHaveBeenCalledTimes(1)
    expect(mockedDlx).toHaveBeenCalledWith(
      expect.arrayContaining(['shadcn@latest', 'add', 'popover', 'command', 'button']),
      { cwd, pm: 'npm' },
    )
  })
})

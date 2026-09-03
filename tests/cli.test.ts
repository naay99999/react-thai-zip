import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { isEntryPoint, main, parseCliArgs } from '../src/cli.js'
import { registryItems } from '../src/registry.js'

// Drives the help-listing assertions below from the actual registry instead of a
// hardcoded subset, so they stay correct as component-type items are added/removed.
const componentItemNames = registryItems.filter((item) => item.type === 'component').map((item) => item.name)

vi.mock('../src/commands/add.js', () => ({
  addComponents: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../src/commands/init.js', () => ({
  initProject: vi.fn().mockResolvedValue(undefined),
}))

describe('main', () => {
  const originalError = console.error
  const originalExitCode = process.exitCode

  afterEach(() => {
    console.error = originalError
    process.exitCode = originalExitCode
    vi.restoreAllMocks()
  })

  it('prints the available command for unknown input', async () => {
    const error = vi.fn()
    console.error = error

    await main(['unknown'])

    expect(error).toHaveBeenCalledWith('Unknown command. Available: init, add [component]')
    expect(process.exitCode).toBe(1)
  })

  it('passes all targets when multiple component names are given', async () => {
    const { addComponents } = await import('../src/commands/add.js')

    await main(['add', 'autocomplete', 'cascade-select'])

    expect(vi.mocked(addComponents)).toHaveBeenCalledWith({
      targets: ['autocomplete', 'cascade-select'],
      yes: false,
      overwrite: false,
    })
  })
})

describe('parseCliArgs', () => {
  it('extracts flags from anywhere in argv', () => {
    expect(parseCliArgs(['add', 'autocomplete', '--yes', 'cascade-select', '--overwrite'])).toEqual({
      command: 'add',
      targets: ['autocomplete', 'cascade-select'],
      flags: { yes: true, overwrite: true, help: false, version: false },
    })
  })
})

describe('main flag handling', () => {
  it('--help prints usage and exits 0', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    await main(['--help'])
    expect(log.mock.calls.flat().join('\n')).toContain('react-thaizip add')
    expect(process.exitCode ?? 0).toBe(0)
    log.mockRestore()
  })

  it('--version prints a semver', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    await main(['--version'])
    expect(log.mock.calls.flat().join('')).toMatch(/\d+\.\d+\.\d+/)
    log.mockRestore()
  })

  it('rejects unknown flags', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    await main(['add', '--frobnicate'])
    expect(process.exitCode).toBe(1)
    process.exitCode = 0
    error.mockRestore()
  })

  it('--help wins over --version', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    await main(['--help', '--version'])
    const output = log.mock.calls.flat().join('\n')
    expect(output).toContain('Usage:')
    expect(output).not.toMatch(/^\d+\.\d+\.\d+$/m)
    log.mockRestore()
  })

  it('"add --help" prints add-scoped usage and does not invoke addComponents', async () => {
    const { addComponents } = await import('../src/commands/add.js')
    vi.mocked(addComponents).mockClear()
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})

    await main(['add', '--help'])

    const output = log.mock.calls.flat().join('\n')
    expect(output).toContain('react-thaizip add')
    for (const name of componentItemNames) {
      expect(output).toContain(name)
    }
    expect(vi.mocked(addComponents)).not.toHaveBeenCalled()
    log.mockRestore()
  })

  it('"init --help" prints init-scoped usage without the component list', async () => {
    const { initProject } = await import('../src/commands/init.js')
    vi.mocked(initProject).mockClear()
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})

    await main(['init', '--help'])

    const output = log.mock.calls.flat().join('\n')
    expect(output).toContain('react-thaizip init')
    for (const name of componentItemNames) {
      expect(output).not.toContain(name)
    }
    expect(vi.mocked(initProject)).not.toHaveBeenCalled()
    log.mockRestore()
  })

  it('aligns the component description columns in global help output', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    await main(['--help'])
    const output = log.mock.calls.flat().join('\n')
    const namePattern = componentItemNames.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
    const lines = output.split('\n').filter((line) => new RegExp(`^  (${namePattern})\\s+`).test(line))
    expect(lines).toHaveLength(componentItemNames.length)
    const prefixLengths = lines.map((line) => /^  (\S+)\s+/.exec(line)?.[0].length)
    expect(new Set(prefixLengths).size).toBe(1)
    log.mockRestore()
  })
})

describe('isEntryPoint', () => {
  // Regression coverage for: npm/npx/yarn/pnpm always invoke a package's
  // `bin` entry through a symlink. process.argv[1] keeps the symlink path,
  // but Node's ESM loader resolves import.meta.url through it to the real
  // file. A naive `moduleUrl === pathToFileURL(invoked).href` comparison
  // (the pre-fix code) therefore never matches when invoked via a symlinked
  // bin, so the CLI silently never ran. This exercises the real filesystem
  // symlink mechanism (fs.symlinkSync) rather than mocking it away.
  let dir: string
  let realFile: string
  let symlinkFile: string

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'react-thaizip-cli-entrypoint-'))
    realFile = path.join(dir, 'real', 'cli.js')
    symlinkFile = path.join(dir, 'linked-bin')
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  function makeRealFileAndSymlink(): void {
    mkdirSync(path.dirname(realFile), { recursive: true })
    writeFileSync(realFile, '// stub\n')
    symlinkSync(realFile, symlinkFile)
  }

  it('sanity check: a symlink and its target do NOT produce the same file:// URL', () => {
    // Proves this fixture actually exercises the symlink mechanism: if this
    // assertion ever failed, the test below would pass for the wrong reason.
    makeRealFileAndSymlink()
    expect(pathToFileURL(symlinkFile).href).not.toBe(pathToFileURL(realFile).href)
  })

  it('returns true when invoked via a symlinked bin (matches the real npx/npm-link mechanism)', () => {
    makeRealFileAndSymlink()
    // moduleUrl mirrors what import.meta.url would be for the real (symlink-resolved) file.
    // Node's ESM loader resolves import.meta.url through *every* symlink in
    // the path (including OS-level ones, e.g. macOS's /var -> /private/var),
    // so mimic that with realpathSync rather than the raw path.
    const moduleUrl = pathToFileURL(realpathSync(realFile)).href
    expect(isEntryPoint(symlinkFile, moduleUrl)).toBe(true)
  })

  it('would have failed against the old direct (non-realpath) comparison', () => {
    makeRealFileAndSymlink()
    // Node's ESM loader resolves import.meta.url through *every* symlink in
    // the path (including OS-level ones, e.g. macOS's /var -> /private/var),
    // so mimic that with realpathSync rather than the raw path.
    const moduleUrl = pathToFileURL(realpathSync(realFile)).href
    // This is exactly the pre-fix logic: import.meta.url === pathToFileURL(invoked).href
    const naiveMatch = moduleUrl === pathToFileURL(symlinkFile).href
    expect(naiveMatch).toBe(false)
  })

  it('returns true when invoked directly with no symlink involved', () => {
    makeRealFileAndSymlink()
    // Node's ESM loader resolves import.meta.url through *every* symlink in
    // the path (including OS-level ones, e.g. macOS's /var -> /private/var),
    // so mimic that with realpathSync rather than the raw path.
    const moduleUrl = pathToFileURL(realpathSync(realFile)).href
    expect(isEntryPoint(realFile, moduleUrl)).toBe(true)
  })

  it('returns false when invoked path is undefined', () => {
    expect(isEntryPoint(undefined, 'file:///whatever')).toBe(false)
  })

  it('falls back to a direct comparison when the invoked path does not exist on disk', () => {
    const missing = path.join(dir, 'does-not-exist.js')
    expect(isEntryPoint(missing, pathToFileURL(missing).href)).toBe(true)
    expect(isEntryPoint(missing, 'file:///something-else.js')).toBe(false)
  })

  it('returns false for an unrelated module URL even when the path resolves fine', () => {
    makeRealFileAndSymlink()
    expect(isEntryPoint(symlinkFile, 'file:///not-the-same-file.js')).toBe(false)
  })
})

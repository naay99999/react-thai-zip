import { main, parseCliArgs } from '../src/cli.js'

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
})

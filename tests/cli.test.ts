import { main } from '../src/cli.js'

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

    expect(vi.mocked(addComponents)).toHaveBeenCalledWith({ targets: ['autocomplete', 'cascade-select'] })
  })
})

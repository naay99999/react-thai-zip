import { main } from '../src/cli.js'

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

    expect(error).toHaveBeenCalledWith('Unknown command. Available: add autocomplete')
    expect(process.exitCode).toBe(1)
  })
})

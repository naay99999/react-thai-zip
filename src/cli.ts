import { pathToFileURL } from 'node:url'
import { addComponents } from './commands/add.js'
import { initProject } from './commands/init.js'
import { getRegistryVersion } from './utils/config.js'
import { registryItems } from './registry.js'

export type CliFlags = { yes: boolean; overwrite: boolean; help: boolean; version: boolean }

const FLAG_MAP: Record<string, keyof CliFlags> = {
  '--yes': 'yes',
  '-y': 'yes',
  '--overwrite': 'overwrite',
  '--help': 'help',
  '-h': 'help',
  '--version': 'version',
  '-v': 'version',
}

export function parseCliArgs(argv: string[]): { command: string | undefined; targets: string[]; flags: CliFlags } {
  const flags: CliFlags = { yes: false, overwrite: false, help: false, version: false }
  const positionals: string[] = []
  for (const arg of argv) {
    const flag = FLAG_MAP[arg]
    if (flag) {
      flags[flag] = true
      continue
    }
    if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`)
    positionals.push(arg)
  }
  const [command, ...targets] = positionals
  return { command, targets, flags }
}

function printHelp(): void {
  const lines = [
    'Usage:',
    '  react-thaizip init [--yes]',
    '  react-thaizip add [component...] [--yes] [--overwrite]',
    '',
    'Flags:',
    '  --yes, -y        Skip confirmation prompts',
    '  --overwrite      Overwrite existing files without prompting',
    '  --help, -h       Print this help message',
    '  --version, -v    Print the CLI version',
    '',
    'Components:',
    ...registryItems.filter((item) => item.type === 'component').map((item) => `  ${item.name}  ${item.description}`),
  ]
  console.log(lines.join('\n'))
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  let parsed: { command: string | undefined; targets: string[]; flags: CliFlags }
  try {
    parsed = parseCliArgs(argv)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
    return
  }

  const { command, targets, flags } = parsed

  if (flags.version) {
    console.log(await getRegistryVersion())
    return
  }

  if (flags.help) {
    printHelp()
    return
  }

  if (command === 'init') {
    await initProject({ yes: flags.yes })
    return
  }

  if (command === 'add') {
    await addComponents({ targets, yes: flags.yes, overwrite: flags.overwrite })
    return
  }

  console.error('Unknown command. Available: init, add [component]')
  process.exitCode = 1
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error: unknown) => {
    if (error instanceof Error) {
      console.error(error.message)
    } else {
      console.error(error)
    }
    process.exitCode = 1
  })
}

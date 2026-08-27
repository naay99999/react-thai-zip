import { realpathSync } from 'node:fs'
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

const GLOBAL_FLAG_LINES = [
  '  --yes, -y        Skip confirmation prompts',
  '  --overwrite      Overwrite existing files without prompting',
  '  --help, -h       Print this help message',
  '  --version, -v    Print the CLI version',
]

function componentLines(): string[] {
  const components = registryItems.filter((item) => item.type === 'component')
  const width = Math.max(...components.map((item) => item.name.length))
  return components.map((item) => `  ${item.name.padEnd(width + 2)}${item.description}`)
}

function printHelp(command?: string): void {
  if (command === 'init') {
    console.log(
      [
        'Usage:',
        '  react-thaizip init [--yes]',
        '',
        'Detects your project layout and Tailwind setup, writes design tokens,',
        'installs thaizip, and creates thaizip.config.json.',
        '',
        'Flags:',
        '  --yes, -y        Skip confirmation prompts',
      ].join('\n'),
    )
    return
  }

  if (command === 'add') {
    console.log(
      [
        'Usage:',
        '  react-thaizip add [component...] [--yes] [--overwrite]',
        '',
        'Flags:',
        '  --yes, -y        Skip confirmation prompts',
        '  --overwrite      Overwrite existing component files without prompting',
        '',
        'Components:',
        ...componentLines(),
      ].join('\n'),
    )
    return
  }

  console.log(
    [
      'Usage:',
      '  react-thaizip init [--yes]',
      '  react-thaizip add [component...] [--yes] [--overwrite]',
      '',
      'Flags:',
      ...GLOBAL_FLAG_LINES,
      '',
      'Components:',
      ...componentLines(),
    ].join('\n'),
  )
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

  if (flags.help) {
    printHelp(command)
    return
  }

  if (flags.version) {
    console.log(await getRegistryVersion())
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

// Exported (and parameterized) so the symlink-resolution behavior can be
// unit-tested directly with a real fs.symlinkSync fixture, without needing a
// built dist/cli.js or a subprocess.
export function isEntryPoint(
  invoked: string | undefined = process.argv[1],
  moduleUrl: string = import.meta.url,
): boolean {
  if (!invoked) return false
  // process.argv[1] can be a symlink (e.g. an npm/npx-linked bin), while
  // import.meta.url always reflects the resolved real path — resolve both
  // through realpath so the identity check still matches when run via a bin link.
  try {
    return moduleUrl === pathToFileURL(realpathSync(invoked)).href
  } catch {
    return moduleUrl === pathToFileURL(invoked).href
  }
}

if (isEntryPoint()) {
  main().catch((error: unknown) => {
    if (error instanceof Error) {
      console.error(error.message)
    } else {
      console.error(error)
    }
    process.exitCode = 1
  })
}

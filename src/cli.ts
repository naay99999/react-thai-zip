import { pathToFileURL } from 'node:url'
import { addComponents } from './commands/add.js'
import { initProject } from './commands/init.js'

function extractLangOption(args: string[]): { lang?: string; targets: string[] } {
  const targets: string[] = []
  let lang: string | undefined

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--lang') {
      lang = args[i + 1]
      i++
      continue
    }
    targets.push(args[i])
  }

  return { lang, targets }
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const [command, ...targets] = argv

  if (command === 'init') {
    await initProject()
    return
  }

  if (command === 'add') {
    const { lang, targets: remainingTargets } = extractLangOption(targets)
    await addComponents(lang ? { targets: remainingTargets, lang } : { targets: remainingTargets })
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

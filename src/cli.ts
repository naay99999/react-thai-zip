import { pathToFileURL } from 'node:url'
import { addComponents } from './commands/add.js'
import { initProject } from './commands/init.js'

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const [command, target] = argv

  if (command === 'init') {
    await initProject()
    return
  }

  if (command === 'add') {
    await addComponents({ targets: target ? [target] : [] })
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

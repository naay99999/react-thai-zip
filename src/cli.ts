import { addAutocomplete } from './commands/add.js'
import { pathToFileURL } from 'node:url'

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const [command, target] = argv

  if (command === 'add' && target === 'autocomplete') {
    await addAutocomplete()
    return
  }

  console.error('Unknown command. Available: add autocomplete')
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

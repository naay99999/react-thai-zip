import path from 'node:path'
import prompts from 'prompts'
import { detectPM } from '../utils/detectPM.js'
import { detectProjectStructure } from '../utils/detectProjectStructure.js'
import { detectTailwind } from '../utils/detectTailwind.js'
import { installTailwind } from '../utils/installTailwind.js'
import { installPackage } from '../utils/install.js'
import { copyTemplate } from '../utils/copyTemplate.js'
import { pathExists } from '../utils/fs.js'

type AddAutocompleteOptions = {
  cwd?: string
}

export async function addAutocomplete(options: AddAutocompleteOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd()
  const pm = await detectPM(cwd)
  const destination = await detectProjectStructure(cwd)

  console.log(`Detected package manager: ${pm}`)
  console.log(`Component destination: ${path.relative(cwd, destination.filePath)}`)

  const hasTailwind = await detectTailwind(cwd)
  if (!hasTailwind) {
    const response = await prompts({
      type: 'confirm',
      name: 'install',
      message: 'Tailwind not detected. Install it?',
      initial: true,
    })

    if (!response.install) {
      console.log('\nTailwind CSS is required for the generated component styles.')
      console.log('Install it manually, then run this command again:')
      console.log('  npm install -D tailwindcss postcss autoprefixer')
      console.log('  npx tailwindcss init -p')
      process.exitCode = 1
      return
    }

    try {
      await installTailwind({ cwd, pm })
    } catch (error) {
      console.error('\nFailed to install Tailwind CSS.')
      console.error('Install it manually, then run this command again:')
      console.error('  npm install -D tailwindcss postcss autoprefixer')
      console.error('  npx tailwindcss init -p')
      if (error instanceof Error) {
        console.error(`\n${error.message}`)
      }
      process.exitCode = 1
      return
    }
  }

  try {
    await installPackage(['thaizip'], { cwd, pm })
  } catch (error) {
    console.error('\nFailed to install thaizip.')
    console.error(`Install it manually with your package manager, then run this command again:`)
    console.error(`  ${pm === 'npm' ? 'npm install thaizip' : `${pm} add thaizip`}`)
    if (error instanceof Error) {
      console.error(`\n${error.message}`)
    }
    process.exitCode = 1
    return
  }

  let overwrite = false
  if (await pathExists(destination.filePath)) {
    const response = await prompts({
      type: 'confirm',
      name: 'overwrite',
      message: `${path.relative(cwd, destination.filePath)} already exists. Overwrite?`,
      initial: false,
    })
    overwrite = Boolean(response.overwrite)
  }

  const copied = await copyTemplate({
    destination: destination.filePath,
    overwrite,
  })

  if (copied === 'skipped') {
    console.log('\nSkipped writing component.')
    return
  }

  const importPath = `./${path.relative(cwd, destination.filePath).replace(/\\/g, '/').replace(/\.tsx$/, '')}`

  console.log('\nThaiAddressAutocomplete added successfully.')
  console.log(`\nImport it from:`)
  console.log(`  import { ThaiAddressAutocomplete } from '${importPath}'`)
  console.log('\nUsage:')
  console.log(`  <ThaiAddressAutocomplete onSelect={(address) => console.log(address)} />`)
}

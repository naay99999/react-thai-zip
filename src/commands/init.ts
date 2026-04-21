import path from 'node:path'
import prompts from 'prompts'
import { CORE_PACKAGE_NAME, CORE_PACKAGE_VERSION, configExists, getRegistryVersion, writeConfig } from '../utils/config.js'
import { detectPM } from '../utils/detectPM.js'
import { detectProjectLanguage } from '../utils/detectLanguage.js'
import { detectProjectStructure } from '../utils/detectProjectStructure.js'
import { detectTailwind } from '../utils/detectTailwind.js'
import { installPackage } from '../utils/install.js'
import { installTailwind } from '../utils/installTailwind.js'
import { hasPackageDependency } from '../utils/packageJson.js'

type InitProjectOptions = {
  cwd?: string
}

export async function initProject(options: InitProjectOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd()
  const pm = await detectPM(cwd)
  const project = await detectProjectStructure(cwd)
  const language = await detectProjectLanguage(cwd)
  const registryVersion = await getRegistryVersion()

  let useTypeScript = language === 'ts'
  if (language === 'unknown') {
    const response = await prompts({
      type: 'confirm',
      name: 'typescript',
      message: 'Use TypeScript components?',
      initial: true,
    })
    useTypeScript = Boolean(response.typescript)
  }

  let componentDir = path.relative(cwd, project.directory).replace(/\\/g, '/')
  const directoryResponse = await prompts({
    type: 'text',
    name: 'componentDir',
    message: 'Where should components be written?',
    initial: componentDir,
  })
  if (directoryResponse.componentDir) {
    componentDir = String(directoryResponse.componentDir)
  }

  const hasTailwind = await detectTailwind(cwd)
  if (!hasTailwind) {
    const response = await prompts({
      type: 'confirm',
      name: 'install',
      message: 'Tailwind not detected. Install it?',
      initial: true,
    })

    if (response.install) {
      await installTailwind({ cwd, pm })
    }
  }

  if (!(await hasPackageDependency(CORE_PACKAGE_NAME, cwd))) {
    const response = await prompts({
      type: 'confirm',
      name: 'install',
      message: 'thaizip is not installed. Install it?',
      initial: true,
    })

    if (response.install) {
      await installPackage([CORE_PACKAGE_NAME], { cwd, pm })
    }
  }

  if (await configExists(cwd)) {
    const response = await prompts({
      type: 'confirm',
      name: 'overwrite',
      message: 'thaizip.config.json already exists. Overwrite it?',
      initial: false,
    })

    if (!response.overwrite) {
      console.log('\nSkipped writing thaizip.config.json.')
      return
    }
  }

  await writeConfig(
    {
      typescript: useTypeScript,
      componentDir,
      packageManager: pm,
      corePackage: {
        name: CORE_PACKAGE_NAME,
        version: CORE_PACKAGE_VERSION,
      },
      registryVersion,
    },
    cwd,
  )

  console.log('\nCreated thaizip.config.json.')
}

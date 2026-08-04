import path from 'node:path'
import prompts from 'prompts'
import { CORE_PACKAGE_NAME, CORE_PACKAGE_VERSION, configExists, getRegistryVersion, writeConfig } from '../utils/config.js'
import { detectPM } from '../utils/detectPM.js'
import { detectProjectStructure } from '../utils/detectProjectStructure.js'
import { detectTailwind } from '../utils/detectTailwind.js'
import { installPackage } from '../utils/install.js'
import { hasPackageDependency } from '../utils/packageJson.js'
import { confirm } from '../utils/prompt.js'
import { buildTokenBlock, buildV3ConfigSnippet, ensureTokens } from '../utils/tokens.js'

export type InitProjectOptions = {
  cwd?: string
  yes?: boolean
}

export async function initProject(options: InitProjectOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd()
  const yes = options.yes ?? false
  const pm = await detectPM(cwd)
  const project = await detectProjectStructure(cwd)
  const registryVersion = await getRegistryVersion()

  const useTypeScript = true
  const libDir = 'lib'
  const hooksDir = 'hooks'

  let componentDir = path.relative(cwd, project.directory).replace(/\\/g, '/')
  if (!yes) {
    const directoryResponse = await prompts({
      type: 'text',
      name: 'componentDir',
      message: 'Where should components be written?',
      initial: componentDir,
    })
    if (directoryResponse.componentDir) {
      componentDir = String(directoryResponse.componentDir)
    }
  }

  const tailwind = await detectTailwind(cwd)
  if (!tailwind) {
    console.error(
      '\nTailwind CSS is required. Install it for your framework (https://tailwindcss.com/docs/installation), then re-run npx react-thaizip init.',
    )
    process.exitCode = 1
    return
  }

  const { version, cssPath } = tailwind

  if (cssPath) {
    const result = await ensureTokens(path.join(cwd, cssPath), version)
    console.log(
      result === 'written'
        ? `\nAdded design tokens to ${cssPath}.`
        : `\nDesign tokens already present in ${cssPath}. Skipped writing.`,
    )
  } else {
    console.log('\nNo global CSS file was found. Add the design tokens manually — see README.')
    console.log(buildTokenBlock(version))
  }

  if (version === 3) {
    console.log(buildV3ConfigSnippet())
  }

  if (!(await hasPackageDependency(CORE_PACKAGE_NAME, cwd))) {
    const shouldInstall = await confirm('thaizip is not installed. Install it?', true, yes)

    if (shouldInstall) {
      await installPackage([`${CORE_PACKAGE_NAME}@${CORE_PACKAGE_VERSION}`], { cwd, pm })
    }
  }

  if (await configExists(cwd)) {
    const shouldOverwrite = await confirm('thaizip.config.json already exists. Overwrite it?', false, yes)

    if (!shouldOverwrite) {
      console.log('\nSkipped writing thaizip.config.json.')
      return
    }
  }

  await writeConfig(
    {
      typescript: useTypeScript,
      componentDir,
      libDir,
      hooksDir,
      packageManager: pm,
      tailwind: { version, css: cssPath ?? '' },
      registryVersion,
    },
    cwd,
  )

  console.log('\nCreated thaizip.config.json.')
}

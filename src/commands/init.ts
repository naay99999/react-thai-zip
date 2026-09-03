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

  // Detect Tailwind before prompting for anything, so a missing Tailwind
  // install aborts the run immediately instead of after the user has
  // already answered the componentDir prompt.
  const tailwind = await detectTailwind(cwd)
  if (!tailwind) {
    console.error(
      '\nTailwind CSS is required. Install it for your framework (https://tailwindcss.com/docs/installation), then re-run npx react-thaizip init.',
    )
    process.exitCode = 1
    return
  }

  const { version, cssPath } = tailwind

  let componentDir = path.relative(cwd, project.directory).replace(/\\/g, '/')
  const libDir = path.relative(cwd, project.libDir).replace(/\\/g, '/')
  const hooksDir = path.relative(cwd, project.hooksDir).replace(/\\/g, '/')

  // Surface what was detected before any files are written or prompts are
  // answered, so the user can sanity-check the guesses up front.
  console.log('\nDetected project settings:')
  console.log(`  Components directory: ${componentDir}`)
  console.log(`  Lib directory: ${libDir}`)
  console.log(`  Hooks directory: ${hooksDir}`)
  console.log(`  Package manager: ${pm}`)
  console.log(`  Tailwind: v${version}${cssPath ? ` (${cssPath})` : ' (no global CSS file found)'}`)

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

  // Manual follow-up steps the user MUST perform by hand (pasting a config
  // snippet, adding a CSS token block) are collected here instead of being
  // printed immediately, so they aren't scrolled off-screen by npm install
  // output. They're all printed together at the very end of the run.
  const manualSteps: string[] = []

  if (cssPath) {
    const result = await ensureTokens(path.join(cwd, cssPath), version)
    console.log(
      result === 'written'
        ? `\nAdded design tokens to ${cssPath}.`
        : `\nDesign tokens already present in ${cssPath}. Skipped writing.`,
    )
  } else {
    manualSteps.push(
      `No global CSS file was found. Add these design tokens to your global CSS manually:\n\n${buildTokenBlock(version)}`,
    )
  }

  if (version === 3) {
    manualSteps.push(buildV3ConfigSnippet())
  }

  const printManualSteps = () => {
    if (manualSteps.length === 0) return
    console.log('\n=== Manual steps required ===')
    for (const step of manualSteps) {
      console.log(`\n${step}`)
    }
  }

  if (!(await hasPackageDependency(CORE_PACKAGE_NAME, cwd))) {
    const shouldInstall = await confirm('thaizip is not installed. Install it?', true, yes)

    if (shouldInstall) {
      const spec = `${CORE_PACKAGE_NAME}@${CORE_PACKAGE_VERSION}`
      try {
        await installPackage([spec], { cwd, pm })
      } catch (error) {
        const hint = pm === 'npm' ? `npm i '${spec}'` : `${pm} add '${spec}'`
        console.error(`\nFailed to install ${CORE_PACKAGE_NAME}.`)
        console.error(`Install it manually (${hint}), then re-run npx react-thaizip init.`)
        if (error instanceof Error) console.error(`\n${error.message}`)
        process.exitCode = 1
        printManualSteps()
        return
      }
    }
  }

  if (await configExists(cwd)) {
    const shouldOverwrite = await confirm('thaizip.config.json already exists. Overwrite it?', false, yes)

    if (!shouldOverwrite) {
      console.log('\nSkipped writing thaizip.config.json.')
      printManualSteps()
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

  printManualSteps()

  console.log('\nNext: run `npx react-thaizip add autocomplete` to add your first component.')
}

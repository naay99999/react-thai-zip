import path from 'node:path'
import prompts from 'prompts'
import { installPackage } from '../utils/install.js'
import { copyTemplate, getTemplatePath } from '../utils/copyTemplate.js'
import { pathExists } from '../utils/fs.js'
import { CORE_PACKAGE_NAME, MINIMUM_THAIZIP_VERSION, configExists, readConfig } from '../utils/config.js'
import { getInstalledPackageVersion, getPackageDependencyRange, hasPackageDependency } from '../utils/packageJson.js'
import { extractVersionAnchor, isVersionAtLeast } from '../utils/semver.js'
import { registryItems, resolveRegistryItem, type RegistryItem } from '../registry.js'
import { initProject } from './init.js'

type AddComponentsOptions = {
  cwd?: string
  targets?: string[]
  yes?: boolean // consumed in Task 8
  overwrite?: boolean // consumed in Task 8
}

export async function addComponents(options: AddComponentsOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd()
  const targets = options.targets ?? []

  if (!(await configExists(cwd))) {
    const response = await prompts({
      type: 'confirm',
      name: 'init',
      message: 'No thaizip.config.json found. Run init now?',
      initial: true,
    })

    if (!response.init) {
      console.log('\nRun `npx react-thaizip init` before adding components.')
      process.exitCode = 1
      return
    }

    await initProject({ cwd })
  }

  const config = await readConfig(cwd)
  const selectedTargets = await selectComponents(targets)
  if (selectedTargets.length === 0) {
    console.log('\nNo components selected.')
    return
  }

  const missingDependencies = await getMissingDependencies(cwd, selectedTargets.flatMap((component) => component.dependencies))

  // thaizip already being present doesn't mean it's new enough — the
  // templates rely on the cascade/enumeration API and bilingual (en/th)
  // labels added in 0.7.0, so a project that installed an older thaizip
  // before this CLI was updated would otherwise pass the name-only
  // dependency check above and then receive a component that fails to
  // resolve at build time.
  const needsCorePackage = selectedTargets.some((component) => component.dependencies.includes(CORE_PACKAGE_NAME))
  if (needsCorePackage && !missingDependencies.includes(CORE_PACKAGE_NAME)) {
    const versionCheck = await checkCorePackageVersion(cwd)
    if (!versionCheck.ok) {
      console.error(
        `\n${CORE_PACKAGE_NAME} >=${MINIMUM_THAIZIP_VERSION} is required for the cascade/enumeration API and bilingual labels used by these components; found ${versionCheck.found}.`,
      )
      console.error(`Run \`npm i ${CORE_PACKAGE_NAME}@latest\` (or your package manager's equivalent), then run this command again.`)
      process.exitCode = 1
      return
    }
  }

  if (missingDependencies.length > 0) {
    const response = await prompts({
      type: 'confirm',
      name: 'install',
      message: `Install missing dependencies (${missingDependencies.join(', ')})?`,
      initial: true,
    })

    if (!response.install) {
      console.log('\nSkipped writing components. Install the missing dependencies, then run this command again.')
      process.exitCode = 1
      return
    }

    try {
      await installPackage(missingDependencies, { cwd, pm: config.packageManager })
    } catch (error) {
      console.error('\nFailed to install dependencies.')
      console.error(`Install them manually, then run this command again: ${missingDependencies.join(', ')}`)
      if (error instanceof Error) {
        console.error(`\n${error.message}`)
      }
      process.exitCode = 1
      return
    }
  }

  for (const component of selectedTargets) {
    const fileName = component.files[0].target.file
    const destination = path.join(cwd, config.componentDir, fileName)

    let overwrite = false
    if (await pathExists(destination)) {
      const response = await prompts({
        type: 'confirm',
        name: 'overwrite',
        message: `${path.relative(cwd, destination)} already exists. Overwrite?`,
        initial: false,
      })
      overwrite = Boolean(response.overwrite)
    }

    const copied = await copyTemplate({
      destination,
      overwrite,
      templatePath: getTemplatePath(fileName),
    })

    if (copied === 'skipped') {
      console.log(`\nSkipped ${component.name}.`)
      continue
    }

    const importPath = `./${path.relative(cwd, destination).replace(/\\/g, '/').replace(/\.(tsx|jsx)$/, '')}`
    console.log(`\n${component.name} added successfully.`)
    console.log(`Import it from:`)
    console.log(`  import { ${component.name} } from '${importPath}'`)
  }
}

type CorePackageVersionCheck = { ok: true } | { ok: false; found: string }

/**
 * Checks the installed/declared thaizip version against MINIMUM_THAIZIP_VERSION.
 * Prefers the version actually resolved under node_modules (ground truth for
 * what will run); falls back to the version range declared in package.json
 * when node_modules hasn't been populated yet (e.g. dependencies were added
 * by hand but `npm install` hasn't run). If neither can be parsed, the check
 * is skipped rather than blocking on a false positive.
 */
async function checkCorePackageVersion(cwd: string): Promise<CorePackageVersionCheck> {
  const installedVersion = await getInstalledPackageVersion(CORE_PACKAGE_NAME, cwd)
  if (installedVersion) {
    return isVersionAtLeast(installedVersion, MINIMUM_THAIZIP_VERSION) ? { ok: true } : { ok: false, found: installedVersion }
  }

  const declaredRange = await getPackageDependencyRange(CORE_PACKAGE_NAME, cwd)
  if (!declaredRange) return { ok: true }

  const anchor = extractVersionAnchor(declaredRange)
  if (!anchor) return { ok: true }

  return isVersionAtLeast(anchor, MINIMUM_THAIZIP_VERSION) ? { ok: true } : { ok: false, found: anchor }
}

async function getMissingDependencies(cwd: string, dependencies: string[]): Promise<string[]> {
  const uniqueDependencies = Array.from(new Set(dependencies))
  const missingDependencies: string[] = []

  for (const dependency of uniqueDependencies) {
    if (!(await hasPackageDependency(dependency, cwd))) {
      missingDependencies.push(dependency)
    }
  }

  return missingDependencies
}

async function selectComponents(targets: string[]): Promise<RegistryItem[]> {
  if (targets.length > 0) {
    return targets.map((target) => {
      const component = resolveRegistryItem(target)
      if (!component) {
        throw new Error(`Unknown component: ${target}`)
      }
      return component
    })
  }

  const response = await prompts({
    type: 'multiselect',
    name: 'components',
    message: 'Which components would you like to add?',
    choices: registryItems.map((component) => ({
      title: component.name,
      description: component.description,
      value: component.name,
    })),
  })

  const selected = Array.isArray(response.components) ? response.components : []
  return selected.map((name) => {
    const component = resolveRegistryItem(String(name))
    if (!component) {
      throw new Error(`Unknown component: ${name}`)
    }
    return component
  })
}

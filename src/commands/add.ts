import path from 'node:path'
import prompts from 'prompts'
import { installPackage } from '../utils/install.js'
import { copyTemplate, getTemplatePath } from '../utils/copyTemplate.js'
import { pathExists } from '../utils/fs.js'
import { configExists, readConfig } from '../utils/config.js'
import { hasPackageDependency } from '../utils/packageJson.js'
import { getComponentTemplateFile, registryComponents, resolveRegistryComponent } from '../registry.js'
import { initProject } from './init.js'

type AddComponentsOptions = {
  cwd?: string
  targets?: string[]
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

  const language = config.typescript ? 'ts' : 'js'

  for (const component of selectedTargets) {
    const fileName = getComponentTemplateFile(component, language)
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
      templatePath: getTemplatePath(fileName, language),
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

async function selectComponents(targets: string[]) {
  if (targets.length > 0) {
    return targets.map((target) => {
      const component = resolveRegistryComponent(target)
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
    choices: registryComponents.map((component) => ({
      title: component.name,
      description: component.description,
      value: component.name,
    })),
  })

  const selected = Array.isArray(response.components) ? response.components : []
  return selected.map((name) => {
    const component = resolveRegistryComponent(String(name))
    if (!component) {
      throw new Error(`Unknown component: ${name}`)
    }
    return component
  })
}

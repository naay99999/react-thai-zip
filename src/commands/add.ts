import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import prompts from 'prompts'
import { installPackage } from '../utils/install.js'
import { copyTemplate, getTemplatePath } from '../utils/copyTemplate.js'
import { pathExists } from '../utils/fs.js'
import { CORE_PACKAGE_NAME, MINIMUM_THAIZIP_VERSION, configExists, readConfig } from '../utils/config.js'
import { detectTailwind } from '../utils/detectTailwind.js'
import { getInstalledPackageVersion, getPackageDependencyRange, hasPackageDependency } from '../utils/packageJson.js'
import { confirm } from '../utils/prompt.js'
import { extractVersionAnchor, isVersionAtLeast } from '../utils/semver.js'
import { rewriteTemplateImports } from '../utils/rewriteImports.js'
import { registryItems, resolveRegistryItem, resolveWithDependencies, type RegistryItem } from '../registry.js'
import { initProject } from './init.js'

type AddComponentsOptions = {
  cwd?: string
  targets?: string[]
  yes?: boolean
  overwrite?: boolean
  registry?: RegistryItem[]
}

export async function addComponents(options: AddComponentsOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd()
  const targets = options.targets ?? []
  const yes = options.yes
  const overwrite = options.overwrite
  const registry = options.registry ?? registryItems

  if (!(await configExists(cwd))) {
    const shouldInit = await confirm('No thaizip.config.json found. Run init now?', true, yes)

    if (!shouldInit) {
      console.log('\nRun `npx react-thaizip init` before adding components.')
      process.exitCode = 1
      return
    }

    await initProject({ cwd, yes })

    if (!(await configExists(cwd))) {
      // init already printed why it bailed (e.g. Tailwind missing) — don't
      // pile a config-not-found stack trace on top of that message.
      process.exitCode = 1
      return
    }
  }

  const detected = await detectTailwind(cwd)
  const config = await readConfig(
    cwd,
    detected ? { tailwind: { version: detected.version, css: detected.cssPath ?? '' } } : undefined,
  )

  const selected = await selectComponents(targets, registry)
  if (selected.length === 0) {
    console.log('\nNo components selected.')
    return
  }

  const resolved = resolveWithDependencies(selected, registry)

  const dependencies = resolved.flatMap((item) => item.dependencies)
  const missingDependencies = await getMissingDependencies(cwd, dependencies)

  // thaizip already being present doesn't mean it's new enough — the
  // templates rely on the cascade/enumeration API and bilingual (en/th)
  // labels added in 0.7.0, so a project that installed an older thaizip
  // before this CLI was updated would otherwise pass the name-only
  // dependency check above and then receive a component that fails to
  // resolve at build time.
  const needsCorePackage = resolved.some((item) => item.dependencies.includes(CORE_PACKAGE_NAME))
  if (needsCorePackage && !missingDependencies.includes(CORE_PACKAGE_NAME)) {
    const versionCheck = await checkCorePackageVersion(cwd)
    if (!versionCheck.ok) {
      console.error(
        `\n${CORE_PACKAGE_NAME} >=${MINIMUM_THAIZIP_VERSION} is required (cascade/enumeration API and bilingual labels added in ${MINIMUM_THAIZIP_VERSION}); found ${versionCheck.found}.`,
      )
      console.error(`Run \`npm i ${CORE_PACKAGE_NAME}@latest\` (or your package manager's equivalent), then run this command again.`)
      process.exitCode = 1
      return
    }
  }

  if (missingDependencies.length > 0) {
    const shouldInstall = await confirm(`Install missing dependencies (${missingDependencies.join(', ')})?`, true, yes)

    if (!shouldInstall) {
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

  for (const item of resolved) {
    let primaryFileCopied = false

    for (const [index, file] of item.files.entries()) {
      const destination = path.join(cwd, config[file.target.dir], file.target.file)
      const exists = await pathExists(destination)

      let allowOverwrite = false
      if (exists) {
        if (item.type === 'lib' || item.type === 'hook') {
          allowOverwrite = false
        } else if (overwrite) {
          allowOverwrite = true
        } else {
          allowOverwrite = await confirm(`${path.relative(cwd, destination)} already exists. Overwrite?`, false, yes)
        }
      }

      const copied = await copyTemplate({
        destination,
        overwrite: allowOverwrite,
        templatePath: getTemplatePath(file.source),
      })

      if (copied === 'skipped') {
        console.log(`\nSkipped ${file.target.file} (already exists).`)
      } else {
        if (index === 0) {
          primaryFileCopied = true
        }

        if (item.type === 'component') {
          const content = await readFile(destination, 'utf8')
          const rewritten = rewriteTemplateImports(content, path.dirname(destination), config, cwd)
          if (rewritten !== content) {
            await writeFile(destination, rewritten, 'utf8')
          }
        }
      }
    }

    if (item.type === 'component' && primaryFileCopied) {
      const primaryFile = item.files[0]
      const destination = path.join(cwd, config[primaryFile.target.dir], primaryFile.target.file)
      const importSymbol = item.exportName ?? path.basename(primaryFile.target.file, path.extname(primaryFile.target.file))
      const importPath = `./${path.relative(cwd, destination).replace(/\\/g, '/').replace(/\.(tsx|jsx|ts|js)$/, '')}`
      console.log(`\n${item.name} added successfully.`)
      console.log(`Import it from:`)
      console.log(`  import { ${importSymbol} } from '${importPath}'`)
    }
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

async function selectComponents(targets: string[], registry: RegistryItem[]): Promise<RegistryItem[]> {
  if (targets.length > 0) {
    return targets.map((target) => {
      const component = resolveRegistryItem(target, registry)
      if (!component) {
        throw new Error(`Unknown component: ${target}. Valid components: ${registry.map((item) => item.name).join(', ')}`)
      }
      return component
    })
  }

  const response = await prompts({
    type: 'multiselect',
    name: 'components',
    message: 'Which components would you like to add?',
    choices: registry
      .filter((item) => item.type === 'component')
      .map((item) => ({
        title: item.name,
        description: item.description,
        value: item.name,
      })),
  })

  const selected = Array.isArray(response.components) ? response.components : []
  return selected.map((name) => {
    const component = resolveRegistryItem(String(name), registry)
    if (!component) {
      throw new Error(`Unknown component: ${name}. Valid components: ${registry.map((item) => item.name).join(', ')}`)
    }
    return component
  })
}

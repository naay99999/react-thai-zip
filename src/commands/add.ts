import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import prompts from 'prompts'
import { installPackage } from '../utils/install.js'
import { getTemplatePath } from '../utils/copyTemplate.js'
import { pathExistsNoFollow } from '../utils/fs.js'
import { stripTypes, toJsExtension } from '../utils/stripTypes.js'
import {
  CORE_PACKAGE_NAME,
  CORE_PACKAGE_VERSION,
  MINIMUM_THAIZIP_VERSION,
  configExists,
  getRegistryVersion,
  readConfig,
  writeConfig,
} from '../utils/config.js'
import { detectTailwind } from '../utils/detectTailwind.js'
import { getInstalledPackageVersion, getPackageDependencyRange, hasPackageDependency } from '../utils/packageJson.js'
import { confirm } from '../utils/prompt.js'
import { compareVersions, extractVersionAnchor, isVersionAtLeast } from '../utils/semver.js'
import { rewriteTemplateImports } from '../utils/rewriteImports.js'
import { assertPathInsideRoot, assertRealPathInsideRoot } from '../utils/pathSafety.js'
import { registryItems, resolveRegistryItem, resolveWithDependencies, selectVariant, type RegistryItem } from '../registry.js'
import { ensureShadcnPrimitives } from '../utils/shadcnPrimitives.js'
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
  const currentRegistryVersion = await getRegistryVersion()

  const selected = await selectComponents(targets, registry)
  if (selected.length === 0) {
    console.log('\nNo components selected.')
    return
  }

  const resolved = resolveWithDependencies(selected, registry)
  const variants = resolved.map((item) => ({ item, variant: selectVariant(item, config.style) }))

  const dependencies = variants.flatMap(({ variant }) => variant.dependencies)
  const missingDependencies = await getMissingDependencies(cwd, dependencies)

  // thaizip already being present doesn't mean it's new enough — the
  // templates rely on the cascade/enumeration API and bilingual (en/th)
  // labels added in 0.7.0, so a project that installed an older thaizip
  // before this CLI was updated would otherwise pass the name-only
  // dependency check above and then receive a component that fails to
  // resolve at build time.
  const needsCorePackage = variants.some(({ variant }) => variant.dependencies.includes(CORE_PACKAGE_NAME))
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
      const installSpecs = missingDependencies.map((dependency) =>
        dependency === CORE_PACKAGE_NAME ? `${CORE_PACKAGE_NAME}@${CORE_PACKAGE_VERSION}` : dependency,
      )
      await installPackage(installSpecs, { cwd, pm: config.packageManager })
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

  if (config.style === 'shadcn') {
    const shadcnPrimitives = Array.from(new Set(variants.flatMap(({ variant }) => variant.shadcnPrimitives)))
    if (shadcnPrimitives.length > 0) {
      try {
        await ensureShadcnPrimitives(shadcnPrimitives, {
          cwd,
          pm: config.packageManager,
          uiDir: config.shadcnUiDir,
          yes: Boolean(yes),
          typescript: config.typescript,
        })
      } catch (error) {
        console.error(`\nFailed to install shadcn primitives (${shadcnPrimitives.join(', ')}).`)
        console.error(`Run \`npx shadcn@latest add ${shadcnPrimitives.join(' ')}\` manually, then run this command again.`)
        if (error instanceof Error) {
          console.error(`\n${error.message}`)
        }
        process.exitCode = 1
        return
      }
    }
  }

  let anyFileWritten = false

  for (const { item, variant } of variants) {
    let primaryFileCopied = false

    for (const [index, file] of variant.files.entries()) {
      const destinationFile = config.typescript ? file.target.file : toJsExtension(file.target.file)
      const destination = path.join(cwd, config[file.target.dir], destinationFile)
      // Defense in depth behind validateConfig's own path checks: the config
      // could still route the write outside the project through a symlink
      // planted in the checked-out repo, which mkdir/writeFile follow silently.
      assertPathInsideRoot(destination, cwd)
      await assertRealPathInsideRoot(destination, cwd)

      const exists = await pathExistsNoFollow(destination)
      const isProtected = item.type === 'lib' || item.type === 'hook'

      let allowOverwrite = false
      if (exists) {
        if (isProtected) {
          // lib/hook files (e.g. lib/utils.ts, hooks/use-thai-address-index.ts)
          // are never touched unless the user explicitly opts in via
          // --overwrite. Users legitimately hand-edit these files, so a
          // prompt-defaulted-yes or a bare --yes must never overwrite them.
          allowOverwrite = Boolean(overwrite)
        } else if (overwrite) {
          allowOverwrite = true
        } else {
          allowOverwrite = await confirm(`${path.relative(cwd, destination)} already exists. Overwrite?`, false, yes)
        }
      }

      const shouldWrite = !exists || allowOverwrite

      if (!shouldWrite) {
        const relativePath = path.relative(cwd, destination)
        if (isProtected) {
          console.log(`\nSkipped ${relativePath} (protected; pass --overwrite to update it).`)
          if (compareVersions(config.registryVersion, currentRegistryVersion) < 0) {
            console.log(
              `${relativePath} predates the current registry (recorded v${config.registryVersion}, current v${currentRegistryVersion}) and may be stale. Run \`npx react-thaizip add ${item.name} --overwrite\` to refresh it.`,
            )
          }
        } else {
          console.log(`\nSkipped ${relativePath} (already exists).`)
        }
      } else {
        // Single in-memory pipeline: read the authored .tsx/.ts template once,
        // strip TS syntax for a JS-target project, rewrite @/lib and @/hooks
        // aliases for component files, then write the result exactly once —
        // replacing the old copy-then-read-back-then-maybe-rewrite dance.
        let content = await readFile(getTemplatePath(file.source), 'utf8')
        if (!config.typescript) content = stripTypes(content, file.source)
        if (item.type === 'component') content = rewriteTemplateImports(content, path.dirname(destination), config, cwd)

        await mkdir(path.dirname(destination), { recursive: true })
        await writeFile(destination, content, 'utf8')

        anyFileWritten = true

        // Report every file that actually lands on disk. Without this, a
        // `lib`/`hook`-only run — exactly what the staleness warning above
        // tells the user to run — would succeed in total silence.
        console.log(`\n${exists ? 'Updated' : 'Wrote'} ${path.relative(cwd, destination)}.`)

        if (index === 0) {
          primaryFileCopied = true
        }
      }
    }

    if (item.type === 'component' && primaryFileCopied) {
      // Must read the resolved variant's files, not item.files (the vanilla
      // set) — otherwise a shadcn-style add would print an import hint for a
      // filename that isn't guaranteed to match what was actually written.
      // Every shadcn variant today happens to target the same filename as
      // its vanilla counterpart, but that's a coincidence, not a guarantee.
      const primaryFile = variant.files[0]
      const primaryDestinationFile = config.typescript ? primaryFile.target.file : toJsExtension(primaryFile.target.file)
      const destination = path.join(cwd, config[primaryFile.target.dir], primaryDestinationFile)
      const importSymbol = item.exportName ?? path.basename(primaryFile.target.file, path.extname(primaryFile.target.file))
      const importPath = `./${path.relative(cwd, destination).replace(/\\/g, '/').replace(/\.(tsx|jsx|ts|js)$/, '')}`
      console.log(`\n${item.name} added successfully.`)
      console.log(`Import it from:`)
      console.log(`  import { ${importSymbol} } from '${importPath}'`)
    }
  }

  // Keep the recorded registryVersion in sync with the CLI that actually
  // wrote the files, so a future `add` can tell a genuinely up-to-date
  // lib/hook file apart from one that predates the current registry.
  if (anyFileWritten && config.registryVersion !== currentRegistryVersion) {
    await writeConfig({ ...config, registryVersion: currentRegistryVersion }, cwd)
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

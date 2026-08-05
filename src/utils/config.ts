import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PackageManager } from './detectPM.js'
import { pathExists } from './fs.js'

export const CONFIG_FILE = 'thaizip.config.json'
export const CORE_PACKAGE_NAME = 'thaizip'
// thaizip 0.7.0 introduced the cascade/enumeration API and bilingual (en/th)
// labels that the scaffolded templates rely on. Left as an open-ended floor
// rather than a caret range so it doesn't exclude the real "latest" tag.
export const CORE_PACKAGE_VERSION = '>=0.7.0'
// Minimum thaizip version required for the cascade/enumeration API and
// bilingual labels used by every scaffolded component. Kept separate from
// CORE_PACKAGE_VERSION (a range string) so version-gate logic has a single
// plain version to compare against.
export const MINIMUM_THAIZIP_VERSION = '0.7.0'

const PACKAGE_MANAGERS: readonly PackageManager[] = ['npm', 'yarn', 'pnpm', 'bun']

export type TailwindInfo = {
  version: 3 | 4
  // Repo-relative path to the project's global CSS file; '' if unknown.
  css: string
}

export type ThaiZipConfig = {
  typescript: true
  componentDir: string
  libDir: string
  hooksDir: string
  packageManager: PackageManager
  tailwind: TailwindInfo
  registryVersion: string
}

export function getConfigPath(cwd = process.cwd()): string {
  return path.join(cwd, CONFIG_FILE)
}

export async function configExists(cwd = process.cwd()): Promise<boolean> {
  return pathExists(getConfigPath(cwd))
}

export function validateConfig(value: unknown): { ok: true; config: ThaiZipConfig } | { ok: false; errors: string[] } {
  const errors: string[] = []

  if (typeof value !== 'object' || value === null) {
    return { ok: false, errors: ['config: expected an object'] }
  }

  const raw = value as Record<string, unknown>

  if (raw.typescript !== true) {
    errors.push('typescript: JavaScript templates are no longer supported; re-run init')
  }
  if (typeof raw.componentDir !== 'string' || raw.componentDir.length === 0) {
    errors.push('componentDir: expected non-empty string')
  }
  if (typeof raw.libDir !== 'string' || raw.libDir.length === 0) {
    errors.push('libDir: expected non-empty string')
  }
  if (typeof raw.hooksDir !== 'string' || raw.hooksDir.length === 0) {
    errors.push('hooksDir: expected non-empty string')
  }
  if (typeof raw.packageManager !== 'string' || !PACKAGE_MANAGERS.includes(raw.packageManager as PackageManager)) {
    errors.push(`packageManager: expected one of ${PACKAGE_MANAGERS.join(', ')}`)
  }
  if (typeof raw.tailwind !== 'object' || raw.tailwind === null) {
    errors.push('tailwind: expected an object with version and css')
  } else {
    const tailwind = raw.tailwind as Record<string, unknown>
    if (tailwind.version !== 3 && tailwind.version !== 4) {
      errors.push('tailwind.version: expected 3 or 4')
    }
    if (typeof tailwind.css !== 'string') {
      errors.push('tailwind.css: expected string')
    }
  }
  if (typeof raw.registryVersion !== 'string' || raw.registryVersion.length === 0) {
    errors.push('registryVersion: expected non-empty string')
  }

  if (errors.length > 0) return { ok: false, errors }
  return { ok: true, config: value as ThaiZipConfig }
}

/**
 * Migrates a v1 thaizip.config.json (componentDir + packageManager, no
 * libDir/hooksDir/tailwind, corePackage instead of a bare registryVersion
 * source of truth) to the v2 shape. Returns null when `raw` doesn't look
 * like a recognizable v1 config.
 */
export function migrateLegacyConfig(raw: Record<string, unknown>, tailwind: TailwindInfo): ThaiZipConfig | null {
  if (typeof raw.componentDir !== 'string' || typeof raw.packageManager !== 'string' || 'libDir' in raw) {
    return null
  }
  // JS templates are no longer supported. Don't silently upgrade a v1 JS
  // project's config to `typescript: true` — fall through to readConfig's
  // "invalid config" path, whose errors (from validateConfig on the raw,
  // unmigrated config) already include the typescript-false message below.
  if (raw.typescript === false) {
    return null
  }

  return {
    typescript: true,
    componentDir: raw.componentDir,
    libDir: 'lib',
    hooksDir: 'hooks',
    packageManager: raw.packageManager as PackageManager,
    tailwind,
    registryVersion: typeof raw.registryVersion === 'string' ? raw.registryVersion : '',
  }
}

export async function readConfig(cwd = process.cwd(), options?: { tailwind?: TailwindInfo }): Promise<ThaiZipConfig> {
  const content = await readFile(getConfigPath(cwd), 'utf8')
  const parsed: unknown = JSON.parse(content)

  const validated = validateConfig(parsed)
  if (validated.ok) return validated.config

  if (typeof parsed === 'object' && parsed !== null) {
    const migrated = migrateLegacyConfig(parsed as Record<string, unknown>, options?.tailwind ?? { version: 4, css: '' })
    if (migrated) {
      const revalidated = validateConfig(migrated)
      if (revalidated.ok) {
        await writeConfig(revalidated.config, cwd)
        console.log('Migrated thaizip.config.json to v2.')
        return revalidated.config
      }
      // The v1 shape was recognized, but migration produced something that
      // still fails validation (e.g. an unsupported packageManager, or a
      // missing registryVersion) — fall through to the same invalid-config
      // error as if migration had never been attempted, rather than writing
      // a broken v2 file to disk.
      throw new Error(
        `Invalid thaizip.config.json:\n  - ${revalidated.errors.join('\n  - ')}\nRe-run \`npx react-thaizip init\` to regenerate it.`,
      )
    }
  }

  throw new Error(
    `Invalid thaizip.config.json:\n  - ${validated.errors.join('\n  - ')}\nRe-run \`npx react-thaizip init\` to regenerate it.`,
  )
}

export async function writeConfig(config: ThaiZipConfig, cwd = process.cwd()): Promise<void> {
  await writeFile(getConfigPath(cwd), `${JSON.stringify(config, null, 2)}\n`, 'utf8')
}

export async function getRegistryVersion(): Promise<string> {
  const currentFile = fileURLToPath(import.meta.url)
  const currentDir = path.dirname(currentFile)
  const candidates = [
    path.resolve(currentDir, '..', '..', 'package.json'),
    path.resolve(currentDir, '..', 'package.json'),
  ]

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      const content = await readFile(candidate, 'utf8')
      const packageJson = JSON.parse(content) as { version?: string }
      if (packageJson.version) return packageJson.version
    }
  }

  return '0.0.0'
}

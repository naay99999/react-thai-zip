import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathExists } from './fs.js'

export type PackageJson = {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

export async function readPackageJson(cwd = process.cwd()): Promise<PackageJson | null> {
  const packageJsonPath = path.join(cwd, 'package.json')
  if (!(await pathExists(packageJsonPath))) {
    return null
  }

  const content = await readFile(packageJsonPath, 'utf8')
  return JSON.parse(content) as PackageJson
}

export async function hasPackageDependency(packageName: string, cwd = process.cwd()): Promise<boolean> {
  const packageJson = await readPackageJson(cwd)
  if (!packageJson) return false

  return Boolean(
    packageJson.dependencies?.[packageName] ??
      packageJson.devDependencies?.[packageName] ??
      packageJson.peerDependencies?.[packageName],
  )
}

/**
 * Returns the raw version/range string a project declares for `packageName`
 * in dependencies/devDependencies/peerDependencies (e.g. `"^0.4.0"`), or
 * `null` if the dependency isn't declared at all.
 */
export async function getPackageDependencyRange(packageName: string, cwd = process.cwd()): Promise<string | null> {
  const packageJson = await readPackageJson(cwd)
  if (!packageJson) return null

  return (
    packageJson.dependencies?.[packageName] ??
    packageJson.devDependencies?.[packageName] ??
    packageJson.peerDependencies?.[packageName] ??
    null
  )
}

/**
 * Returns the exact version actually installed under `node_modules/<packageName>`,
 * or `null` if it isn't installed there (not installed yet, or install failed).
 * This reflects reality (what will actually resolve at runtime) rather than
 * the declared range, which may be wider than what's on disk.
 */
export async function getInstalledPackageVersion(packageName: string, cwd = process.cwd()): Promise<string | null> {
  const installedPackageJsonPath = path.join(cwd, 'node_modules', packageName, 'package.json')
  if (!(await pathExists(installedPackageJsonPath))) return null

  try {
    const content = await readFile(installedPackageJsonPath, 'utf8')
    const installedPackageJson = JSON.parse(content) as { version?: string }
    return installedPackageJson.version ?? null
  } catch {
    return null
  }
}

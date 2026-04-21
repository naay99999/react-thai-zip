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

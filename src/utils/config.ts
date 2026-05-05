import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PackageManager } from './detectPM.js'
import { pathExists } from './fs.js'

export const CONFIG_FILE = 'thaizip.config.json'
export const CORE_PACKAGE_NAME = 'thaizip'
export const CORE_PACKAGE_VERSION = '^0.4.0'

export type ThaiZipConfig = {
  typescript: boolean
  componentDir: string
  packageManager: PackageManager
  corePackage: {
    name: typeof CORE_PACKAGE_NAME
    version: string
  }
  registryVersion: string
}

export function getConfigPath(cwd = process.cwd()): string {
  return path.join(cwd, CONFIG_FILE)
}

export async function configExists(cwd = process.cwd()): Promise<boolean> {
  return pathExists(getConfigPath(cwd))
}

export async function readConfig(cwd = process.cwd()): Promise<ThaiZipConfig> {
  const content = await readFile(getConfigPath(cwd), 'utf8')
  return JSON.parse(content) as ThaiZipConfig
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

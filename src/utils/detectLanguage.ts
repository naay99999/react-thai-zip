import path from 'node:path'
import { pathExists } from './fs.js'

export type ProjectLanguage = 'ts' | 'js' | 'unknown'

export async function detectProjectLanguage(cwd = process.cwd()): Promise<ProjectLanguage> {
  if (await pathExists(path.join(cwd, 'tsconfig.json'))) {
    return 'ts'
  }

  if (await pathExists(path.join(cwd, 'jsconfig.json'))) {
    return 'js'
  }

  return 'unknown'
}

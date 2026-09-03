import path from 'node:path'
import { pathExists } from './fs.js'

export async function detectTypeScript(cwd: string): Promise<boolean> {
  return pathExists(path.join(cwd, 'tsconfig.json'))
}

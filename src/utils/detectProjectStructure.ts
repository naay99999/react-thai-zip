import path from 'node:path'
import { pathExists } from './fs.js'

export type ProjectDestination = {
  directory: string
}

export async function detectProjectStructure(cwd = process.cwd()): Promise<ProjectDestination> {
  if (await pathExists(path.join(cwd, 'app'))) {
    return {
      directory: path.join(cwd, 'app', 'components'),
    }
  }

  if (await pathExists(path.join(cwd, 'pages'))) {
    return {
      directory: path.join(cwd, 'components'),
    }
  }

  return {
    directory: path.join(cwd, 'src', 'components'),
  }
}

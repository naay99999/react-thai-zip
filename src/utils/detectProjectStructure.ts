import path from 'node:path'
import { pathExists } from './fs.js'

export type ProjectStructure = 'app-router' | 'pages-router' | 'fallback'

export type ProjectDestination = {
  structure: ProjectStructure
  directory: string
}

export async function detectProjectStructure(cwd = process.cwd()): Promise<ProjectDestination> {
  if (await pathExists(path.join(cwd, 'app'))) {
    return {
      structure: 'app-router',
      directory: path.join(cwd, 'app', 'components'),
    }
  }

  if (await pathExists(path.join(cwd, 'pages'))) {
    return {
      structure: 'pages-router',
      directory: path.join(cwd, 'components'),
    }
  }

  return {
    structure: 'fallback',
    directory: path.join(cwd, 'src', 'components'),
  }
}

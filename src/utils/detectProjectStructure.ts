import path from 'node:path'
import { pathExists } from './fs.js'

export type ProjectStructure = 'app-router' | 'pages-router' | 'fallback'

export type ProjectDestination = {
  structure: ProjectStructure
  directory: string
  filePath: string
}

export async function detectProjectStructure(cwd = process.cwd()): Promise<ProjectDestination> {
  if (await pathExists(path.join(cwd, 'app'))) {
    const directory = path.join(cwd, 'app', 'components')
    return {
      structure: 'app-router',
      directory,
      filePath: path.join(directory, 'ThaiAddressAutocomplete.tsx'),
    }
  }

  if (await pathExists(path.join(cwd, 'pages'))) {
    const directory = path.join(cwd, 'components')
    return {
      structure: 'pages-router',
      directory,
      filePath: path.join(directory, 'ThaiAddressAutocomplete.tsx'),
    }
  }

  const directory = path.join(cwd, 'src', 'components')
  return {
    structure: 'fallback',
    directory,
    filePath: path.join(directory, 'ThaiAddressAutocomplete.tsx'),
  }
}

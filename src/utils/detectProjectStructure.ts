import path from 'node:path'
import { pathExists } from './fs.js'

export type ProjectDestination = {
  directory: string
  libDir: string
  hooksDir: string
}

// libDir/hooksDir follow the same App Router / Pages Router / src-layout signal as
// componentDir, so a project that lands components under `src/components` also gets
// `src/lib` + `src/hooks` instead of root-level `lib`/`hooks` that wouldn't exist there.
export async function detectProjectStructure(cwd = process.cwd()): Promise<ProjectDestination> {
  if (await pathExists(path.join(cwd, 'app'))) {
    return {
      directory: path.join(cwd, 'app', 'components'),
      libDir: path.join(cwd, 'lib'),
      hooksDir: path.join(cwd, 'hooks'),
    }
  }

  if (await pathExists(path.join(cwd, 'pages'))) {
    return {
      directory: path.join(cwd, 'components'),
      libDir: path.join(cwd, 'lib'),
      hooksDir: path.join(cwd, 'hooks'),
    }
  }

  return {
    directory: path.join(cwd, 'src', 'components'),
    libDir: path.join(cwd, 'src', 'lib'),
    hooksDir: path.join(cwd, 'src', 'hooks'),
  }
}

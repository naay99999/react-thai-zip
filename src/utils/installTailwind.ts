import type { PackageManager } from './detectPM.js'
import { installPackage, runPackageManagerExec } from './install.js'

export async function installTailwind(options: { cwd: string; pm: PackageManager }): Promise<void> {
  await installPackage(['tailwindcss', 'postcss', 'autoprefixer'], {
    cwd: options.cwd,
    pm: options.pm,
    dev: true,
  })

  await runPackageManagerExec(['tailwindcss', 'init', '-p'], options)
}

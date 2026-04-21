import { execa } from 'execa'
import type { PackageManager } from './detectPM.js'
import { getPackageManagerCommands } from './detectPM.js'

export async function installPackage(
  packages: string[],
  options: { cwd: string; pm: PackageManager; dev?: boolean },
): Promise<void> {
  const command = getPackageManagerCommands(options.pm).add(packages, options.dev)
  await execa(command[0], command.slice(1), {
    cwd: options.cwd,
    stdio: 'inherit',
  })
}

export async function runPackageManagerExec(
  args: string[],
  options: { cwd: string; pm: PackageManager },
): Promise<void> {
  const command = getPackageManagerCommands(options.pm).exec(args)
  await execa(command[0], command.slice(1), {
    cwd: options.cwd,
    stdio: 'inherit',
  })
}

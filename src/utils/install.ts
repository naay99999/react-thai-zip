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

// Fetches-and-runs a remote package spec once (e.g. `shadcn@latest add ...`)
// via the project's own package manager — `npx`/`pnpm dlx`/`yarn dlx`/`bunx`.
// Distinct from runPackageManagerExec above, which only resolves a locally
// installed node_modules/.bin binary and cannot fetch an unlisted package.
export async function runPackageManagerDlx(
  args: string[],
  options: { cwd: string; pm: PackageManager },
): Promise<void> {
  const command = getPackageManagerCommands(options.pm).dlx(args)
  await execa(command[0], command.slice(1), {
    cwd: options.cwd,
    stdio: 'inherit',
  })
}

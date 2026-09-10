import spawn from 'cross-spawn'
import type { PackageManager } from './detectPM.js'
import { getPackageManagerCommands } from './detectPM.js'

// cross-spawn (not node:child_process directly) because package-manager
// binaries on Windows are `.cmd` shims (npm.cmd, pnpm.cmd, ...). Node's own
// `spawn` can't execute those without `shell: true`, and since CVE-2024-27980
// Node actively blocks `.cmd`/`.bat` without a shell. `shell: true` would
// reintroduce shell-injection surface this code is deliberately built to
// avoid (argv array, never a shell string) — cross-spawn resolves the shim
// itself while keeping the argv-array contract.
function run(command: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command[0], command.slice(1), {
      cwd,
      stdio: 'inherit',
    })

    child.on('error', (error) => {
      reject(new Error(`Failed to run \`${command.join(' ')}\`: ${error.message}`))
    })

    child.on('close', (code, signal) => {
      if (signal !== null) {
        reject(new Error(`\`${command.join(' ')}\` was terminated by signal ${signal}.`))
        return
      }

      if (code !== 0) {
        reject(new Error(`\`${command.join(' ')}\` exited with code ${code}.`))
        return
      }

      resolve(undefined)
    })
  })
}

export async function installPackage(
  packages: string[],
  options: { cwd: string; pm: PackageManager; dev?: boolean },
): Promise<void> {
  const command = getPackageManagerCommands(options.pm).add(packages, options.dev)
  await run(command, options.cwd)
}

export async function runPackageManagerExec(
  args: string[],
  options: { cwd: string; pm: PackageManager },
): Promise<void> {
  const command = getPackageManagerCommands(options.pm).exec(args)
  await run(command, options.cwd)
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
  await run(command, options.cwd)
}

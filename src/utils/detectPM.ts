import path from 'node:path'
import { pathExists } from './fs.js'

export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun'

export type PackageManagerCommands = {
  name: PackageManager
  install: string[]
  add: (packages: string[], dev?: boolean) => string[]
  // Runs a *locally-installed* binary (node_modules/.bin/...). Not suitable
  // for a remote package spec that needs fetching — use `dlx` for that.
  exec: (args: string[]) => string[]
  // Fetches-and-runs a *remote* package spec once (npx/dlx-style), without
  // requiring it be a project dependency first. This is what a one-off
  // invocation like `shadcn@latest add ...` needs — `exec` above only ever
  // resolves to node_modules/.bin and can't fetch a package on demand.
  dlx: (args: string[]) => string[]
}

const lockfiles: Array<{ file: string; pm: PackageManager }> = [
  { file: 'bun.lock', pm: 'bun' },
  { file: 'bun.lockb', pm: 'bun' },
  { file: 'pnpm-lock.yaml', pm: 'pnpm' },
  { file: 'yarn.lock', pm: 'yarn' },
  { file: 'package-lock.json', pm: 'npm' },
]

export async function detectPM(cwd = process.cwd()): Promise<PackageManager> {
  for (const lockfile of lockfiles) {
    if (await pathExists(path.join(cwd, lockfile.file))) {
      return lockfile.pm
    }
  }

  return 'npm'
}

export function getPackageManagerCommands(pm: PackageManager): PackageManagerCommands {
  switch (pm) {
    case 'bun':
      return {
        name: 'bun',
        install: ['bun', 'install'],
        add: (packages, dev = false) => ['bun', 'add', ...(dev ? ['-d'] : []), ...packages],
        exec: (args) => ['bunx', ...args],
        // bunx already fetches-and-runs a remote spec, same as exec above.
        dlx: (args) => ['bunx', ...args],
      }
    case 'pnpm':
      return {
        name: 'pnpm',
        install: ['pnpm', 'install'],
        add: (packages, dev = false) => ['pnpm', 'add', ...(dev ? ['-D'] : []), ...packages],
        exec: (args) => ['pnpm', 'exec', ...args],
        dlx: (args) => ['pnpm', 'dlx', ...args],
      }
    case 'yarn':
      return {
        name: 'yarn',
        install: ['yarn', 'install'],
        add: (packages, dev = false) => ['yarn', 'add', ...(dev ? ['-D'] : []), ...packages],
        exec: (args) => ['yarn', ...args],
        // Yarn Berry (2+) only — Yarn Classic (v1) has no `dlx` and would fail
        // here. This codebase doesn't distinguish yarn 1 vs Berry anywhere
        // (detectPM only ever returns 'yarn'), so this is a known, accepted
        // limitation for v1 of the shadcn-style feature rather than a bug fix.
        dlx: (args) => ['yarn', 'dlx', ...args],
      }
    case 'npm':
    default:
      return {
        name: 'npm',
        install: ['npm', 'install'],
        add: (packages, dev = false) => ['npm', 'install', ...(dev ? ['--save-dev'] : []), ...packages],
        exec: (args) => ['npm', 'exec', '--', ...args],
        // `npx` requires its own flags before the positional package spec, so
        // `--yes` (suppresses npm's "Need to install… Ok to proceed?" prompt)
        // must come first — verified against `npm help npx`. Any `-y` the
        // caller includes in `args` (e.g. shadcn's own flag) still lands
        // after the package spec and independently controls that CLI's own
        // prompts, unaffected by this one.
        dlx: (args) => ['npx', '--yes', ...args],
      }
  }
}

import path from 'node:path'
import { pathExists } from './fs.js'

export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun'

export type PackageManagerCommands = {
  name: PackageManager
  install: string[]
  add: (packages: string[], dev?: boolean) => string[]
  exec: (args: string[]) => string[]
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
      }
    case 'pnpm':
      return {
        name: 'pnpm',
        install: ['pnpm', 'install'],
        add: (packages, dev = false) => ['pnpm', 'add', ...(dev ? ['-D'] : []), ...packages],
        exec: (args) => ['pnpm', 'exec', ...args],
      }
    case 'yarn':
      return {
        name: 'yarn',
        install: ['yarn', 'install'],
        add: (packages, dev = false) => ['yarn', 'add', ...(dev ? ['-D'] : []), ...packages],
        exec: (args) => ['yarn', ...args],
      }
    case 'npm':
    default:
      return {
        name: 'npm',
        install: ['npm', 'install'],
        add: (packages, dev = false) => ['npm', 'install', ...(dev ? ['--save-dev'] : []), ...packages],
        exec: (args) => ['npm', 'exec', '--', ...args],
      }
  }
}

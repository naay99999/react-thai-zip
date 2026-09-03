import path from 'node:path'
import type { PackageManager } from './detectPM.js'
import { pathExistsNoFollow } from './fs.js'
import { runPackageManagerExec } from './install.js'

export type EnsureShadcnPrimitivesOptions = {
  cwd: string
  pm: PackageManager
  uiDir: string
  yes: boolean
}

/**
 * Ensures every named shadcn primitive (e.g. 'select', 'popover') has a file
 * under the project's shadcn ui directory, running `npx shadcn@latest add`
 * for whatever's missing before this CLI writes its own component files.
 *
 * Never passes `-b`/`--base` — the project's own `components.json` already
 * pins the component library (confirmed Base UI–backed by `detectShadcn`
 * before `style: 'shadcn'` is ever set), and `shadcn add` respects it as-is.
 * Any of shadcn's own transitive dependencies (e.g. `command` pulling in
 * `dialog`/`input-group`) are handled by the shadcn CLI itself.
 */
export async function ensureShadcnPrimitives(primitives: string[], options: EnsureShadcnPrimitivesOptions): Promise<void> {
  const missing: string[] = []

  for (const primitive of primitives) {
    const expectedPath = path.join(options.cwd, options.uiDir, `${primitive}.tsx`)
    // pathExistsNoFollow (not pathExists): a dangling symlink still counts as
    // "something is here" — same rule add.ts already applies to its own
    // never-overwrite-through-a-symlink guard.
    if (!(await pathExistsNoFollow(expectedPath))) {
      missing.push(primitive)
    }
  }

  if (missing.length === 0) return

  await runPackageManagerExec(
    ['shadcn@latest', 'add', ...missing, ...(options.yes ? ['-y'] : [])],
    { cwd: options.cwd, pm: options.pm },
  )
}

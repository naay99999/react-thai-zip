import path from 'node:path'
import type { PackageManager } from './detectPM.js'
import { pathExistsNoFollow } from './fs.js'
import { runPackageManagerDlx } from './install.js'

export type EnsureShadcnPrimitivesOptions = {
  cwd: string
  pm: PackageManager
  uiDir: string
  yes: boolean
  // Whether the target project is TypeScript. A shadcn project with
  // components.json's "tsx": false emits .jsx primitive files instead of
  // .tsx, so the existence check below has to look at the right extension —
  // otherwise every primitive reads as "missing" on every `add`.
  typescript: boolean
}

/**
 * Ensures every named shadcn primitive (e.g. 'select', 'popover') has a file
 * under the project's shadcn ui directory, running `shadcn@latest add` (via
 * the project's package manager's fetch-and-run command — `npx`/`pnpm dlx`/
 * `yarn dlx`/`bunx`, see runPackageManagerDlx) for whatever's missing before
 * this CLI writes its own component files.
 *
 * Never passes `-b`/`--base` — the project's own `components.json` already
 * pins the component library (confirmed Base UI–backed by `detectShadcn`
 * before `style: 'shadcn'` is ever set), and `shadcn add` respects it as-is.
 * Any of shadcn's own transitive dependencies (e.g. `command` pulling in
 * `dialog`/`input-group`) are handled by the shadcn CLI itself.
 */
export async function ensureShadcnPrimitives(primitives: string[], options: EnsureShadcnPrimitivesOptions): Promise<void> {
  const missing: string[] = []
  const extension = options.typescript ? 'tsx' : 'jsx'

  for (const primitive of primitives) {
    const expectedPath = path.join(options.cwd, options.uiDir, `${primitive}.${extension}`)
    // pathExistsNoFollow (not pathExists): a dangling symlink still counts as
    // "something is here" — same rule add.ts already applies to its own
    // never-overwrite-through-a-symlink guard.
    if (!(await pathExistsNoFollow(expectedPath))) {
      missing.push(primitive)
    }
  }

  if (missing.length === 0) return

  await runPackageManagerDlx(
    ['shadcn@latest', 'add', ...missing, ...(options.yes ? ['-y'] : [])],
    { cwd: options.cwd, pm: options.pm },
  )
}

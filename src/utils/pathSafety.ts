import { lstat, readlink, realpath } from 'node:fs/promises'
import path from 'node:path'

/**
 * True when `target` resolves to a location strictly inside `root`.
 *
 * Lexical only — it resolves `.`/`..` segments but knows nothing about
 * symlinks. Pair it with `assertRealPathInsideRoot` before writing.
 */
export function isPathInsideRoot(target: string, root: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(target))
  return relative.length > 0 && !relative.startsWith('..') && !path.isAbsolute(relative)
}

/**
 * Throws unless `target` resolves to a location strictly inside `root`.
 *
 * Guards the scaffolder's write path against a thaizip.config.json whose
 * componentDir/libDir/hooksDir climbs out of the project with `..`.
 */
export function assertPathInsideRoot(target: string, root: string): void {
  if (!isPathInsideRoot(target, root)) {
    throw new Error(`Refusing to write outside the project: ${target}`)
  }
}

/**
 * Throws unless `target` still lands inside `root` once every symlink on the
 * way has been resolved.
 *
 * The lexical check above can be defeated by a symlink planted in a checked-out
 * repo — a `components -> ../../elsewhere` directory, or a (possibly dangling)
 * symlink sitting at the destination itself, both of which `mkdir`/`copyFile`
 * follow silently. `target` need not exist: the deepest existing ancestor is
 * resolved and the not-yet-created remainder is re-joined onto it, so the check
 * runs *before* anything is created.
 */
export async function assertRealPathInsideRoot(target: string, root: string): Promise<void> {
  const resolvedRoot = await realpath(root)
  const resolvedTarget = await resolveThroughSymlinks(target)

  if (!isPathInsideRoot(resolvedTarget, resolvedRoot)) {
    throw new Error(`Refusing to write outside the project: ${target} resolves to ${resolvedTarget}`)
  }
}

// Depth cap mirrors the kernel's own symlink-loop guard; a cycle would
// otherwise recurse forever instead of surfacing as a refusal.
const MAX_SYMLINK_DEPTH = 40

/**
 * Resolves `target` as far as the filesystem allows: existing components are
 * resolved with realpath, a dangling symlink is followed by hand (it still
 * points somewhere, and that target is what a write would land on), and any
 * remaining not-yet-created segments are re-joined onto the resolved prefix.
 */
async function resolveThroughSymlinks(target: string, depth = 0): Promise<string> {
  const resolved = path.resolve(target)

  if (depth > MAX_SYMLINK_DEPTH) {
    throw new Error(`Refusing to write outside the project: too many symlinks to resolve ${target}`)
  }

  try {
    return await realpath(resolved)
  } catch {
    // Not fully resolvable yet — fall through and figure out why.
  }

  try {
    const stats = await lstat(resolved)
    if (stats.isSymbolicLink()) {
      const link = await readlink(resolved)
      return resolveThroughSymlinks(path.resolve(path.dirname(resolved), link), depth + 1)
    }
  } catch {
    // The entry genuinely doesn't exist; resolve its parent instead.
  }

  const parent = path.dirname(resolved)
  if (parent === resolved) return resolved

  return path.join(await resolveThroughSymlinks(parent, depth + 1), path.basename(resolved))
}

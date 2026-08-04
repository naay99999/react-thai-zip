/**
 * Minimal semver helpers. Deliberately not the `semver` package — the CLI
 * only needs to (a) pull a comparable version out of a possibly-fuzzy range
 * string like "^0.4.0" and (b) compare two dotted version numbers. It does
 * not need full range-satisfaction logic.
 */

/**
 * Extracts the first `major.minor.patch`-looking token from an arbitrary
 * version or semver range string, e.g. `"^0.4.0"` -> `"0.4.0"`,
 * `">=0.6.0"` -> `"0.6.0"`, `"~0.6.2"` -> `"0.6.2"`, `"0.6.0"` -> `"0.6.0"`.
 * Returns `null` for strings with no recognizable version token (e.g.
 * `"latest"`, `"workspace:*"`).
 */
export function extractVersionAnchor(input: string): string | null {
  const match = input.match(/\d+\.\d+\.\d+/)
  return match ? match[0] : null
}

/**
 * Compares two dotted version strings numerically component-by-component,
 * ignoring any pre-release/build metadata after a `-` or `+`. Returns a
 * negative number if `a < b`, zero if equal, and a positive number if
 * `a > b` — the same contract as `Array.prototype.sort` comparators.
 */
export function compareVersions(a: string, b: string): number {
  const toParts = (v: string) =>
    v
      .split(/[-+]/)[0]
      .split('.')
      .map((n) => parseInt(n, 10) || 0)

  const partsA = toParts(a)
  const partsB = toParts(b)
  const length = Math.max(partsA.length, partsB.length)

  for (let i = 0; i < length; i++) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0)
    if (diff !== 0) return diff
  }

  return 0
}

/** Returns true if `version` is greater than or equal to `minimum`. */
export function isVersionAtLeast(version: string, minimum: string): boolean {
  return compareVersions(version, minimum) >= 0
}

/** Same order as remarkNpm's tabs, so both kinds of command block line up. */
export const PACKAGE_MANAGERS = ['npm', 'pnpm', 'yarn', 'bun'] as const
export type PackageManager = (typeof PACKAGE_MANAGERS)[number]

/**
 * Converts the two npm command shapes the docs generate (`npx <pkg> ...` and
 * `npm install <deps>`) the same way remarkNpm's npm-to-yarn does.
 */
export function toPackageManager(command: string, manager: PackageManager): string {
  if (manager === 'npm') return command
  const npx = /^npx (.+)$/.exec(command)
  if (npx) return `${manager === 'bun' ? 'bun x' : `${manager} dlx`} ${npx[1]}`
  const install = /^npm install (.+)$/.exec(command)
  if (install) return `${manager} add ${install[1]}`
  throw new Error(`Unsupported npm command: ${command}`)
}

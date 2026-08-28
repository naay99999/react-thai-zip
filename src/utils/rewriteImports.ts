import path from 'node:path'
import type { ThaiZipConfig } from './config.js'
import { assertPathInsideRoot } from './pathSafety.js'

// Templates are authored against a fixed `@/lib/*` and `@/hooks/*` alias
// (matching the shadcn/ui convention) so they typecheck standalone under
// tsconfig.templates.json. Real user projects rarely wire that alias up, so
// at scaffold time each import is rewritten to a relative path pointing at
// wherever the user's config actually placed libDir/hooksDir.
const IMPORT_ALIASES: ReadonlyArray<{ pattern: RegExp; dirKey: 'libDir' | 'hooksDir' }> = [
  { pattern: /(['"])@\/lib\/([^'"]+)\1/g, dirKey: 'libDir' },
  { pattern: /(['"])@\/hooks\/([^'"]+)\1/g, dirKey: 'hooksDir' },
]

/**
 * Rewrites `@/lib/*` and `@/hooks/*` import specifiers in `content` to
 * relative paths from `destinationDir` to `<cwd>/<config.libDir|hooksDir>/*`
 * (no file extension, POSIX separators, `./`-prefixed when not already
 * relative).
 *
 * The regex rewrites any quoted `@/lib/...` or `@/hooks/...` substring
 * unconditionally — it doesn't parse the file as JS/TS — so this is only
 * safe to run over trusted, maintainer-authored template content, not
 * arbitrary user files.
 */
export function rewriteTemplateImports(content: string, destinationDir: string, config: ThaiZipConfig, cwd: string): string {
  let result = content
  for (const { pattern, dirKey } of IMPORT_ALIASES) {
    result = result.replace(pattern, (_match, quote: string, rest: string) => {
      const target = path.join(cwd, config[dirKey], rest)
      // The captured specifier tail is whatever sat between the alias and the
      // closing quote, so `@/lib/../../x` would otherwise point the rewritten
      // import at a module outside the project entirely.
      assertPathInsideRoot(target, cwd)

      let relative = path.relative(destinationDir, target).split(path.sep).join('/')
      if (!relative.startsWith('.')) relative = `./${relative}`
      return `${quote}${escapeStringLiteral(relative, quote)}${quote}`
    })
  }
  return result
}

/**
 * Escapes `value` for embedding inside a `quote`-delimited JS string literal.
 *
 * The rewritten path is spliced between the template's original quote
 * characters, so without this a quote inside libDir/hooksDir would terminate
 * the literal early and turn everything after it into executable code in the
 * file scaffolded into the user's project.
 */
function escapeStringLiteral(value: string, quote: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(new RegExp(quote === '"' ? '"' : "'", 'g'), `\\${quote}`)
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

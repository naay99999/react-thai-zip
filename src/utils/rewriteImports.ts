import path from 'node:path'
import type { ThaiZipConfig } from './config.js'

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
      let relative = path.relative(destinationDir, path.join(cwd, config[dirKey], rest)).split(path.sep).join('/')
      if (!relative.startsWith('.')) relative = `./${relative}`
      return `${quote}${relative}${quote}`
    })
  }
  return result
}

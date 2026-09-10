import { createRequire } from 'node:module'

// `typescript` is ~22.8 MB and costs ~107 ms to load, but it is only needed for
// JS-target scaffolds (config.typescript === false). Requiring it lazily keeps
// it off the startup path of every other command — including --help/--version.
// createRequire (not `await import`) so stripTypes stays synchronous.
let cachedTs: typeof import('typescript') | undefined
function loadTypeScript(): typeof import('typescript') {
  cachedTs ??= createRequire(import.meta.url)('typescript') as typeof import('typescript')
  return cachedTs
}

/**
 * Strips TypeScript syntax from `code` while leaving JSX, comments, string
 * literals (including non-ASCII), and all import/export specifiers exactly
 * as authored — so rewriteTemplateImports can still run its regex rewrite
 * over the result. Only called for JS-target projects (config.typescript
 * === false); TS-target scaffolds copy the .tsx/.ts source unmodified.
 */
export function stripTypes(code: string, fileName: string): string {
  const ts = loadTypeScript()
  const result = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.Preserve,
      target: ts.ScriptTarget.ESNext,
      jsx: ts.JsxEmit.Preserve,
    },
    fileName,
    reportDiagnostics: true,
  })
  if (result.diagnostics && result.diagnostics.length > 0) {
    const messages = result.diagnostics
      .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, ' '))
      .join('; ')
    throw new Error(`Failed to strip types from ${fileName}: ${messages}`)
  }
  return result.outputText
}

/** Maps a template's authored `.tsx`/`.ts` filename to its JS-target extension. */
export function toJsExtension(fileName: string): string {
  if (fileName.endsWith('.tsx')) return `${fileName.slice(0, -4)}.jsx`
  if (fileName.endsWith('.ts')) return `${fileName.slice(0, -3)}.js`
  return fileName
}

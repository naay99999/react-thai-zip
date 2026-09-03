import ts from 'typescript'

/**
 * Strips TypeScript syntax from `code` while leaving JSX, comments, string
 * literals (including non-ASCII), and all import/export specifiers exactly
 * as authored — so rewriteTemplateImports can still run its regex rewrite
 * over the result. Only called for JS-target projects (config.typescript
 * === false); TS-target scaffolds copy the .tsx/.ts source unmodified.
 */
export function stripTypes(code: string, fileName: string): string {
  const result = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.Preserve,
      target: ts.ScriptTarget.ESNext,
      jsx: ts.JsxEmit.Preserve,
    },
    fileName,
  })
  return result.outputText
}

/** Maps a template's authored `.tsx`/`.ts` filename to its JS-target extension. */
export function toJsExtension(fileName: string): string {
  if (fileName.endsWith('.tsx')) return `${fileName.slice(0, -4)}.jsx`
  if (fileName.endsWith('.ts')) return `${fileName.slice(0, -3)}.js`
  return fileName
}

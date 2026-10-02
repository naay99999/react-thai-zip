import { createRequire } from 'node:module'

// Only JS-target scaffolds need a TSX syntax transform. Load the smaller
// Sucrase package on demand so help/init and TS-target adds stay fast.
let cachedTransform: typeof import('sucrase').transform | undefined
function loadTransform(): typeof import('sucrase').transform {
  cachedTransform ??= (createRequire(import.meta.url)('sucrase') as typeof import('sucrase')).transform
  return cachedTransform
}

/**
 * Strips TypeScript syntax from `code` while leaving JSX, comments, string
 * literals (including non-ASCII), and all import/export specifiers exactly
 * as authored — so rewriteTemplateImports can still run its regex rewrite
 * over the result. Only called for JS-target projects (config.typescript
 * === false); TS-target scaffolds copy the .tsx/.ts source unmodified.
 */
export function stripTypes(code: string, fileName: string): string {
  try {
    return loadTransform()(code, {
      transforms: ['typescript', 'jsx'],
      jsxRuntime: 'preserve',
      disableESTransforms: true,
      filePath: fileName,
    }).code
  } catch (cause) {
    throw new Error(`Failed to strip types from ${fileName}: ${cause instanceof Error ? cause.message : String(cause)}`)
  }
}

/** Maps a template's authored `.tsx`/`.ts` filename to its JS-target extension. */
export function toJsExtension(fileName: string): string {
  if (fileName.endsWith('.tsx')) return `${fileName.slice(0, -4)}.jsx`
  if (fileName.endsWith('.ts')) return `${fileName.slice(0, -3)}.js`
  return fileName
}

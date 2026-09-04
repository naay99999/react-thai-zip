import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathExists } from './fs.js'

export type ShadcnDetection =
  | { present: true; supported: true; style: string; uiAlias: string; uiDir: string }
  | { present: true; supported: false; style: string }
  | { present: false }

const DEFAULT_UI_ALIAS = '@/components/ui'

async function readJson(filePath: string): Promise<Record<string, unknown> | null> {
  try {
    const content = await readFile(filePath, 'utf8')
    return JSON.parse(content) as Record<string, unknown>
  } catch {
    return null
  }
}

/**
 * Resolves an `@/...`-style import specifier to a project-relative
 * filesystem directory using `tsconfig.json`'s (or `jsconfig.json`'s for a
 * JS-target project) `compilerOptions.paths`. Falls back to a `src/`-presence
 * heuristic — the same one `detectProjectStructure` already uses elsewhere in
 * this codebase — when no matching `paths` entry is found.
 */
async function resolveAliasDir(cwd: string, uiAlias: string): Promise<string> {
  const match = uiAlias.match(/^([^/]+)\/(.*)$/)
  const aliasPrefix = match ? `${match[1]}/` : uiAlias
  const tail = match ? match[2] : ''

  for (const configFile of ['tsconfig.json', 'jsconfig.json']) {
    const config = await readJson(path.join(cwd, configFile))
    const paths = (config?.compilerOptions as Record<string, unknown> | undefined)?.paths as
      | Record<string, string[]>
      | undefined
    if (!paths) continue

    const patternKey = `${aliasPrefix}*`
    const mapped = paths[patternKey]?.[0]
    if (typeof mapped === 'string') {
      const base = mapped.replace(/^\.\//, '').replace(/\/?\*$/, '')
      return path.posix.join(base, tail)
    }
  }

  const hasSrc = await pathExists(path.join(cwd, 'src'))
  const base = hasSrc ? 'src' : ''
  return path.posix.join(base, tail || 'components/ui')
}

export async function detectShadcn(cwd = process.cwd()): Promise<ShadcnDetection> {
  const componentsJson = await readJson(path.join(cwd, 'components.json'))
  if (!componentsJson) return { present: false }

  const style = typeof componentsJson.style === 'string' ? componentsJson.style : ''
  if (!style.startsWith('base-')) {
    return { present: true, supported: false, style }
  }

  const aliases = componentsJson.aliases as Record<string, unknown> | undefined
  const uiAlias = typeof aliases?.ui === 'string' ? aliases.ui : DEFAULT_UI_ALIAS
  const uiDir = await resolveAliasDir(cwd, uiAlias)

  return { present: true, supported: true, style, uiAlias, uiDir }
}

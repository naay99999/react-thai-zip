import { existsSync } from 'node:fs'
import path from 'node:path'

/**
 * `apps/docs`. Next.js runs from there; the repo's own vitest suite runs from
 * the repo root and exercises these modules too.
 */
export const docsRoot = existsSync(path.join(process.cwd(), 'content/docs'))
  ? process.cwd()
  : path.join(process.cwd(), 'apps/docs')

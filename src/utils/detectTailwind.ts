import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathExists } from './fs.js'
import { getPackageDependencyRange } from './packageJson.js'
import { extractVersionAnchor } from './semver.js'

export type TailwindDetection = { version: 3 | 4; cssPath: string | null } | null

export const globalCssCandidates: string[] = [
  'app/globals.css',
  'src/app/globals.css',
  'styles/globals.css',
  'src/styles/globals.css',
  'src/index.css',
  'src/App.css',
  'app/global.css',
]

const tailwindConfigFiles = [
  'tailwind.config.ts',
  'tailwind.config.js',
  'tailwind.config.cjs',
  'tailwind.config.mjs',
]

async function readCandidate(cwd: string, candidate: string): Promise<string | null> {
  return readFile(path.join(cwd, candidate), 'utf8').catch(() => null)
}

export async function detectTailwind(cwd = process.cwd()): Promise<TailwindDetection> {
  for (const candidate of globalCssCandidates) {
    const content = await readCandidate(cwd, candidate)
    if (content && (content.includes('@import "tailwindcss"') || content.includes("@import 'tailwindcss'"))) {
      return { version: 4, cssPath: candidate }
    }
  }

  const range = await getPackageDependencyRange('tailwindcss', cwd)
  if (range) {
    const anchor = extractVersionAnchor(range)
    if (anchor && Number(anchor.split('.')[0]) >= 4) {
      return { version: 4, cssPath: null }
    }
  }

  for (const configFile of tailwindConfigFiles) {
    if (await pathExists(path.join(cwd, configFile))) {
      let cssPath: string | null = null
      for (const candidate of globalCssCandidates) {
        const content = await readCandidate(cwd, candidate)
        if (content && content.includes('@tailwind')) {
          cssPath = candidate
          break
        }
      }
      return { version: 3, cssPath }
    }
  }

  return null
}

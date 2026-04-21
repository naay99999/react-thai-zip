import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import { copyFileEnsuringDir, pathExists } from './fs.js'
import type { TemplateLanguage } from '../registry.js'

const currentFile = fileURLToPath(import.meta.url)
const currentDir = path.dirname(currentFile)

export function getTemplatePath(fileName = 'ThaiAddressAutocomplete.tsx', language: TemplateLanguage = 'ts'): string {
  const candidates = [
    path.resolve(currentDir, '..', 'templates', 'react', language, fileName),
    path.resolve(currentDir, '..', '..', 'templates', 'react', language, fileName),
  ]

  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0]
}

export async function copyTemplate(options: {
  destination: string
  overwrite?: boolean
  templatePath?: string
}): Promise<'copied' | 'skipped'> {
  const exists = await pathExists(options.destination)
  if (exists && !options.overwrite) {
    return 'skipped'
  }

  await copyFileEnsuringDir(options.templatePath ?? getTemplatePath(), options.destination)
  return 'copied'
}

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import { copyFileEnsuringDir, pathExistsNoFollow } from './fs.js'

const currentFile = fileURLToPath(import.meta.url)
const currentDir = path.dirname(currentFile)

export function getTemplatePath(source = 'react/ts/thai-address-autocomplete.tsx'): string {
  const candidates = [path.resolve(currentDir, '..', 'templates', source), path.resolve(currentDir, '..', '..', 'templates', source)]

  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0]
}

export async function copyTemplate(options: {
  destination: string
  overwrite?: boolean
  templatePath?: string
}): Promise<'copied' | 'skipped'> {
  const exists = await pathExistsNoFollow(options.destination)
  if (exists && !options.overwrite) {
    return 'skipped'
  }

  await copyFileEnsuringDir(options.templatePath ?? getTemplatePath(), options.destination)
  return 'copied'
}

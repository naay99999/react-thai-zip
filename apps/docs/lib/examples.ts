import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { docsRoot } from './paths'

const examplesDirectory = path.join(docsRoot, 'examples')

/** Source of `examples/<name>.tsx` — what the Code tab and page markdown show. */
export async function readExampleSource(name: string): Promise<string> {
  if (!/^[a-z0-9-]+$/.test(name)) throw new Error(`Invalid example name: ${name}`)
  return (await readFile(path.join(examplesDirectory, `${name}.tsx`), 'utf8')).trim()
}

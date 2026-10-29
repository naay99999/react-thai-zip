import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { registryItems } from '../src/registry.js'

describe('templates/registry.json', () => {
  it('matches src/registry.ts (run `npm run generate-registry` after changing the registry)', async () => {
    const json = JSON.parse(await readFile(path.join(process.cwd(), 'templates/registry.json'), 'utf8'))
    expect(json).toEqual({ items: registryItems })
  })

  it('points every template file at a file that ships in the package', async () => {
    const sources = registryItems.flatMap((item) => [
      ...item.files,
      ...Object.values(item.shadcn ?? {}).flatMap((variant) => variant.files),
    ])
    for (const { source } of sources) {
      await expect(readFile(path.join(process.cwd(), 'templates', source), 'utf8')).resolves.toBeTruthy()
    }
  })
})

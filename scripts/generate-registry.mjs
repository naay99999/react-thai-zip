#!/usr/bin/env node
// Writes templates/registry.json from src/registry.ts so the published package
// carries the registry as data (the bundled dist/cli.js doesn't expose it).
// Consumers such as the docs site read it to show the same files, dependencies
// and shadcn primitives `add` would use. tests/registryJson.test.ts fails when
// the committed file drifts from src/registry.ts — re-run this script to fix it.
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
// Node strips the type annotations from src/registry.ts itself (Node >= 22.18).
const { registryItems } = await import(path.join(root, 'src/registry.ts'))

await writeFile(path.join(root, 'templates/registry.json'), `${JSON.stringify({ items: registryItems }, null, 2)}\n`)
console.log('Wrote templates/registry.json.')

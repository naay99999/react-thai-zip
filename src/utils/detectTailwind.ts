import path from 'node:path'
import { pathExists } from './fs.js'

const tailwindConfigFiles = [
  'tailwind.config.ts',
  'tailwind.config.js',
  'tailwind.config.cjs',
  'tailwind.config.mjs',
]

export async function detectTailwind(cwd = process.cwd()): Promise<boolean> {
  for (const configFile of tailwindConfigFiles) {
    if (await pathExists(path.join(cwd, configFile))) {
      return true
    }
  }

  return false
}

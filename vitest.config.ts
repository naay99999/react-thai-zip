import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      '@/lib/utils': path.resolve(dirname, 'templates/react/ts/lib/utils.ts'),
      '@/hooks/use-thai-address-index': path.resolve(dirname, 'templates/react/ts/hooks/use-thai-address-index.ts'),
    },
  },
})

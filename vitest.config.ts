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
      '@/components/ui/button': path.resolve(dirname, 'templates/react/ts/shadcn/__fixtures__/components/ui/button.tsx'),
      '@/components/ui/input': path.resolve(dirname, 'templates/react/ts/shadcn/__fixtures__/components/ui/input.tsx'),
      '@/components/ui/label': path.resolve(dirname, 'templates/react/ts/shadcn/__fixtures__/components/ui/label.tsx'),
      '@/components/ui/popover': path.resolve(dirname, 'templates/react/ts/shadcn/__fixtures__/components/ui/popover.tsx'),
      '@/components/ui/select': path.resolve(dirname, 'templates/react/ts/shadcn/__fixtures__/components/ui/select.tsx'),
      '@/components/ui/command': path.resolve(dirname, 'templates/react/ts/shadcn/__fixtures__/components/ui/command.tsx'),
      '@/components/ui/dialog': path.resolve(dirname, 'templates/react/ts/shadcn/__fixtures__/components/ui/dialog.tsx'),
      '@/components/ui/input-group': path.resolve(dirname, 'templates/react/ts/shadcn/__fixtures__/components/ui/input-group.tsx'),
      '@/components/ui/textarea': path.resolve(dirname, 'templates/react/ts/shadcn/__fixtures__/components/ui/textarea.tsx'),
    },
  },
})

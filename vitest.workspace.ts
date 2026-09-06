import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineWorkspace } from 'vitest/config'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const sharedAliases = {
  '@/lib/utils': path.resolve(dirname, 'templates/react/ts/lib/utils.ts'),
  '@/hooks/use-thai-address-index': path.resolve(dirname, 'templates/react/ts/hooks/use-thai-address-index.ts'),
  '@/hooks/use-thai-address-cascade': path.resolve(dirname, 'templates/react/ts/hooks/use-thai-address-cascade.ts'),
}

// One alias map per shadcn component library: a scaffolded template imports
// `@/components/ui/select` regardless of library, so the fixture trees can
// never coexist in a single resolver.
const UI_PRIMITIVES = ['button', 'input', 'label', 'popover', 'select', 'command', 'dialog', 'input-group', 'textarea']

function uiAliases(base: string): Record<string, string> {
  return Object.fromEntries(
    UI_PRIMITIVES.map((name) => [
      `@/components/ui/${name}`,
      path.resolve(dirname, `templates/react/ts/shadcn/__fixtures__/${base}/components/ui/${name}.tsx`),
    ]),
  )
}

function shadcnProject(base: string) {
  return {
    esbuild: { jsx: 'automatic' as const },
    test: {
      name: `shadcn-${base}`,
      globals: true,
      environment: 'node' as const,
      include: [`tests/**/*.${base}.test.tsx`],
    },
    resolve: { alias: { ...sharedAliases, ...uiAliases(base) } },
  }
}

export default defineWorkspace([
  {
    esbuild: { jsx: 'automatic' as const },
    test: {
      name: 'vanilla',
      globals: true,
      environment: 'node' as const,
      include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
      exclude: ['tests/**/*.base.test.tsx', 'tests/**/*.radix.test.tsx', 'tests/**/*.aria.test.tsx'],
    },
    resolve: { alias: sharedAliases },
  },
  shadcnProject('base'),
  shadcnProject('radix'),
  shadcnProject('aria'),
])

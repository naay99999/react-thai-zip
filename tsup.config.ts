import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  target: 'node18',
  clean: true,
  dts: false,
  // Excluded from the published tarball: the map was 42.7% of the gzip download,
  // and a CLI run via npx has no devtools attached to read it.
  sourcemap: false,
  splitting: false,
  banner: {
    js: '#!/usr/bin/env node',
  },
})

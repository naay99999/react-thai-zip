import { createMDX } from 'fumadocs-mdx/next';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const docsDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(docsDirectory, '../..');

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  turbopack: {
    root: repositoryRoot,
  },
  outputFileTracingRoot: repositoryRoot,
  // Example and template sources are read from disk at render time (Code tabs,
  // manual install steps, page Markdown); ship them with any on-demand render.
  outputFileTracingIncludes: {
    '/**': ['./examples/**/*.tsx', '../../templates/**/*'],
  },
  async rewrites() {
    return [
      { source: '/en/docs.md', destination: '/api/docs-markdown/en' },
      { source: '/docs.md', destination: '/api/docs-markdown/th' },
      { source: '/en/docs/:slug*.md', destination: '/api/docs-markdown/en/:slug*' },
      { source: '/docs/:slug*.md', destination: '/api/docs-markdown/th/:slug*' },
    ];
  },
};

const withMDX = createMDX();

export default withMDX(config);

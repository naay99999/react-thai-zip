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
};

const withMDX = createMDX();

export default withMDX(config);

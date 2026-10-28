import { createMDX } from 'fumadocs-mdx/next';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const docsDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(docsDirectory, '../..');

// Applied to every route. The site is static docs with no auth, so the goal is
// defense in depth: no framing (clickjacking), no MIME sniffing, a minimal
// referrer, and no access to powerful browser features. A full script-src CSP
// is left out because Next's inline bootstrap scripts would need nonces.
const securityHeaders = [
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
];

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // The site serves no remote or user-supplied images, so the on-demand
  // optimizer (/_next/image) is pure attack surface — it has carried SSRF and
  // RCE advisories. Serve images as-is instead.
  images: { unoptimized: true },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  turbopack: {
    root: repositoryRoot,
  },
  outputFileTracingRoot: repositoryRoot,
  // Example and template sources are read from disk at render time (Code tabs,
  // manual install steps, page Markdown); ship them with any on-demand render.
  outputFileTracingIncludes: {
    '/**': ['./examples/**/*.tsx', '../../templates/**/*'],
  },
  // Pages from before the thaizip and react-thaizip docs were merged into one site.
  async redirects() {
    const moved = [
      ['/docs/getting-started', '/docs/react'],
      ['/docs/components', '/docs/react'],
      ['/docs/components/:slug', '/docs/react/:slug'],
      ['/docs/guides/forms', '/docs/react/cascade-select'],
      ['/docs/guides/customization', '/docs/react/customization'],
      ['/docs/guides/using-with-ai', '/docs'],
      ['/docs/reference/:slug', '/docs/react/cli'],
      ['/docs/troubleshooting', '/docs/react/cli'],
    ];
    return moved.flatMap(([source, destination]) => [
      { source, destination, permanent: true },
      { source: `/en${source}`, destination: `/en${destination}`, permanent: true },
    ]);
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

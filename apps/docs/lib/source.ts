import { defineDocs } from 'fumadocs-mdx/macro';
import { applyMdxPreset } from 'fumadocs-mdx/config';
import { loader } from 'fumadocs-core/source';
import { i18n } from './i18n';

const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    // ```npm blocks become npm/pnpm/yarn/bun tabs sharing <PackageManagerCommand>'s group.
    mdxOptions: applyMdxPreset({ remarkNpmOptions: { persist: { id: 'package-manager' } } }),
    postprocess: {
      includeProcessedMarkdown: {
        headingIds: false,
        // Expanded by renderPageMarkdown() in lib/docs-markdown.ts: examples become
        // their source code, install sections become CLI + manual steps.
        mdxAsPlaceholder: ['ComponentPreview', 'ComponentInstall'],
      },
    },
  },
});

export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
  i18n,
});

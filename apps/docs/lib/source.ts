import { defineDocs } from 'fumadocs-mdx/macro';
import { loader } from 'fumadocs-core/source';
import { i18n } from './i18n';

const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    postprocess: {
      includeProcessedMarkdown: {
        stringify(node) {
          if (node.type === 'mdxJsxFlowElement' && typeof node.name === 'string' && node.name.endsWith('Demo')) return ' ';
        },
      },
    },
  },
});

export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
  i18n,
});

import { source } from '~/lib/source';
import { renderDocsIndex } from '~/lib/docs-markdown';

export const dynamic = 'force-static';

export async function GET() {
  const trees = { th: source.getPageTree('th'), en: source.getPageTree('en') };
  return new Response(renderDocsIndex(source.getPages(), trees), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}

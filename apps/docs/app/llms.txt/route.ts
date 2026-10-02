import { source } from '~/lib/source';
import { renderDocsIndex } from '~/lib/docs-markdown';

export async function GET() {
  return new Response(renderDocsIndex(source.getPages()), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}

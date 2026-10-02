import { source } from '~/lib/source';
import { renderFullDocs } from '~/lib/docs-markdown';

export async function GET() {
  return new Response(await renderFullDocs(source.getPages()), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}

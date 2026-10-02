import { source } from '~/lib/source';
import { renderPageMarkdown } from '~/lib/docs-markdown';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ lang: string; slug?: string[] }> },
) {
  const { lang, slug } = await params;
  if (lang !== 'th' && lang !== 'en') return new Response('Not found', { status: 404 });

  const pageSlugs = slug?.length === 1 && slug[0] === 'index' ? [] : slug;
  const page = source.getPage(pageSlugs, lang);
  if (!page) return new Response('Not found', { status: 404 });

  return new Response(await renderPageMarkdown(page), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}

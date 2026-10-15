import { source } from '~/lib/source';
import { renderPageMarkdown } from '~/lib/docs-markdown';

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return source.getPages().flatMap((page) => {
    const lang = page.locale ?? 'th';
    return page.slugs.length === 0
      ? [{ lang, slug: [] }, { lang, slug: ['index'] }]
      : [{ lang, slug: page.slugs }];
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ lang: string; slug?: string[] }> },
) {
  const { lang, slug } = await params;
  if (lang !== 'th' && lang !== 'en') return new Response('Not found', { status: 404 });

  // `/docs/index.md` is kept as an alias of `/docs.md`.
  const pageSlugs = slug?.length === 1 && slug[0] === 'index' ? [] : slug;
  const page = source.getPage(pageSlugs, lang);
  if (!page) return new Response('Not found', { status: 404 });

  return new Response(await renderPageMarkdown(page), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}

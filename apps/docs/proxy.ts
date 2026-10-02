import { createI18nMiddleware } from 'fumadocs-core/i18n/middleware';
import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server';
import { i18n } from '~/lib/i18n';

const i18nProxy = createI18nMiddleware(i18n);

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  const pathname = request.nextUrl.pathname;
  if (/^\/(?:en\/)?docs\/.*\.md$/.test(pathname)) {
    return NextResponse.next();
  }
  if (pathname === '/th' || pathname.startsWith('/th/')) return NextResponse.next();
  if (pathname === '/' || pathname === '/docs' || pathname.startsWith('/docs/')) {
    return NextResponse.rewrite(new URL(`/th${pathname === '/' ? '' : pathname}`, request.url));
  }
  return i18nProxy(request, event);
}

export const config = {
  matcher: ['/((?!api|_next|favicon.ico|favicon.svg|llms.txt|llms-full.txt).*)'],
};

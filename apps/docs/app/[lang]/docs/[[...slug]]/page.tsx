import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  ViewOptionsPopover,
} from '@fumadocs/base-ui/layouts/spacious/page';
import Link from 'next/link';
import { findNeighbour } from 'fumadocs-core/page-tree';
import { source } from '~/lib/source';
import { getPageMarkdownUrl } from '~/lib/docs-markdown';
import { getComponentStyles, type DocsLocale } from '~/lib/component-install';
import { getMDXComponents } from '~/components/mdx';
import { StyleSwitcher } from '~/components/docs-style';

const COPY = {
  th: { previous: 'หน้าก่อนหน้า', next: 'หน้าถัดไป', style: 'Style ของคอมโพเนนต์' },
  en: { previous: 'Previous page', next: 'Next page', style: 'Component style' },
} as const;

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={direction === 'left' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} />
    </svg>
  );
}

function NeighbourLink({ href, label, direction }: { href?: string; label: string; direction: 'left' | 'right' }) {
  const className =
    'inline-flex size-8 items-center justify-center rounded-lg border bg-fd-secondary text-fd-secondary-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground';
  if (!href) {
    return (
      <span aria-hidden className={`${className} opacity-50`}>
        <Chevron direction={direction} />
      </span>
    );
  }
  return (
    <Link href={href} aria-label={label} title={label} className={className}>
      <Chevron direction={direction} />
    </Link>
  );
}

export default async function Page({
  params,
}: {
  params: Promise<{ lang: string; slug?: string[] }>;
}) {
  const { slug, lang } = await params;
  const page = source.getPage(slug, lang);
  if (!page) notFound();

  const MDX = page.data.body;
  const copy = COPY[lang === 'en' ? 'en' : 'th'];
  const neighbours = findNeighbour(source.getPageTree(lang), page.url);
  // Component pages get the style picker, like ui.shadcn.com's Base UI / Radix UI tabs.
  const styles = slug?.[0] === 'components' && slug[1] ? getComponentStyles(slug[1]) : [];

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <div className="mb-6 flex flex-row items-center gap-2">
        <MarkdownCopyButton markdownUrl={getPageMarkdownUrl(page)} />
        <ViewOptionsPopover
          markdownUrl={getPageMarkdownUrl(page)}
          githubUrl={`https://github.com/naay99999/react-thai-zip/blob/main/apps/docs/content/docs/${page.path}`}
        />
        <div className="ms-auto flex gap-2">
          <NeighbourLink href={neighbours.previous?.url} label={copy.previous} direction="left" />
          <NeighbourLink href={neighbours.next?.url} label={copy.next} direction="right" />
        </div>
      </div>
      {styles.length > 1 && (
        <div className="-mt-2 mb-2">
          <StyleSwitcher styles={styles} label={copy.style} />
        </div>
      )}
      <DocsBody>
        <MDX components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug?: string[] }>;
}): Promise<Metadata> {
  const { slug, lang } = await params;
  const page = source.getPage(slug, lang);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
  };
}

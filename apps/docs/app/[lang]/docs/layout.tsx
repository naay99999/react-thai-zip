import type { CSSProperties, ReactNode } from 'react';
import { DocsLayout } from '@fumadocs/base-ui/layouts/spacious';
import { getLayoutTabs } from '@fumadocs/base-ui/layouts/shared';
import { source } from '~/lib/source';
import { baseOptions } from '~/lib/layout.shared';

// Sidebar tab icons, tinted with each section's color like fumadocs.dev's.
const TAB_ICONS = {
  core: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  react: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  ),
};

export default async function Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const tree = source.getPageTree(lang);
  const tabs = getLayoutTabs(tree, {
    transform(option) {
      const section = /\/docs\/react(\/|$)/.test(option.url) ? 'react' : 'core';
      return {
        ...option,
        icon: (
          <div className="size-full text-(--tab-color)" style={{ '--tab-color': `var(--${section}-color)` } as CSSProperties}>
            {TAB_ICONS[section]}
          </div>
        ),
      };
    },
  });

  return (
    <DocsLayout tree={tree} {...baseOptions()} tabs={tabs}>
      {children}
    </DocsLayout>
  );
}

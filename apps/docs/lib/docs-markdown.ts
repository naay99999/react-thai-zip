import type { Node, Root } from 'fumadocs-core/page-tree';
import { renderPlaceholder } from 'fumadocs-core/mdx-plugins/remark-llms.runtime';
import { renderInstallMarkdown, type DocsLocale } from './component-install';
import { readExampleSource } from './examples';

export const SITE_URL = 'https://react-thai-zip.vercel.app';
const THAIZIP_LLMS_URL = 'https://naay99999.github.io/thai-zip/llms.txt';

export type DocsMarkdownPage = {
  url: string;
  locale?: string;
  data: {
    title: string;
    description?: string;
    getText: (type: 'processed') => Promise<string>;
  };
};

type Section = { label: string; pages: DocsMarkdownPage[] };

function getLocale(page: Pick<DocsMarkdownPage, 'locale'>): DocsLocale {
  return page.locale === 'en' ? 'en' : 'th';
}

/** `/docs` → `/docs.md`, `/docs/getting-started` → `/docs/getting-started.md` */
export function getPageMarkdownUrl(page: Pick<DocsMarkdownPage, 'url'>): string {
  return `${page.url.replace(/\/$/, '')}.md`;
}

function absolute(url: string): string {
  return `${SITE_URL}${url}`;
}

/** Turns site-relative markdown links into absolute ones, so the file works outside the site. */
function absolutizeLinks(markdown: string): string {
  return markdown.replace(/\]\((\/[^)\s]*)\)/g, (_, href: string) => `](${absolute(href)})`);
}

async function expandPlaceholders(markdown: string, locale: DocsLocale): Promise<string> {
  return renderPlaceholder(markdown, {
    async ComponentPreview({ attributes }) {
      const name = String(attributes.name);
      return `\n\n\`\`\`tsx title="${name}.tsx"\n${await readExampleSource(name)}\n\`\`\`\n\n`;
    },
    ComponentInstall({ attributes }) {
      return `\n\n${renderInstallMarkdown(String(attributes.name), locale, SITE_URL)}\n\n`;
    },
  });
}

/** Pages of one locale in sidebar order, split at the sidebar's separators. */
function getSections(tree: Root, pages: DocsMarkdownPage[], overview: string): Section[] {
  const byUrl = new Map(pages.map((page) => [page.url, page]));
  const sections: Section[] = [{ label: overview, pages: [] }];

  function visit(nodes: Node[]) {
    for (const node of nodes) {
      if (node.type === 'separator') sections.push({ label: String(node.name ?? ''), pages: [] });
      else if (node.type === 'folder') {
        if (node.index) visit([node.index]);
        visit(node.children);
      } else {
        const page = byUrl.get(node.url);
        if (page) sections.at(-1)!.pages.push(page);
      }
    }
  }

  visit(tree.children);
  return sections.filter((section) => section.pages.length > 0);
}

type LocaleTrees = Record<DocsLocale, Root>;

const LOCALE_COPY = {
  th: { heading: 'ไทย', overview: 'ภาพรวม' },
  en: { heading: 'English', overview: 'Overview' },
} as const;

export function renderDocsIndex(pages: DocsMarkdownPage[], trees: LocaleTrees): string {
  const lines = [
    '# react-thaizip documentation',
    '',
    '> Scaffold Thai address components (autocomplete, cascade select, full address form, read-only display, react-hook-form field) into React or Next.js projects with the react-thaizip CLI, shadcn/ui-style: the component source is copied into your project. Built on the thaizip search library.',
    '',
    `- [Full documentation](${absolute('/llms-full.txt')}): every page below in one file`,
    `- [AI usage guide](${absolute('/en/docs/guides/using-with-ai.md')}): how an AI agent should scaffold and wire the components`,
    `- [thaizip documentation](${THAIZIP_LLMS_URL}): the underlying headless search API (searchThaiAddress, cascade enumeration, React hook)`,
  ];

  for (const locale of ['th', 'en'] as const) {
    const copy = LOCALE_COPY[locale];
    lines.push('', `## ${copy.heading}`);
    const localePages = pages.filter((page) => getLocale(page) === locale);
    for (const section of getSections(trees[locale], localePages, copy.overview)) {
      lines.push('', `### ${section.label}`, '');
      for (const page of section.pages) {
        const description = page.data.description ? `: ${page.data.description}` : '';
        lines.push(`- [${page.data.title}](${absolute(getPageMarkdownUrl(page))})${description}`);
      }
    }
  }

  return `${lines.join('\n')}\n`;
}

export async function renderPageMarkdown(page: DocsMarkdownPage): Promise<string> {
  const processed = await page.data.getText('processed');
  const body = absolutizeLinks(await expandPlaceholders(processed, getLocale(page)))
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const description = page.data.description ? `> ${page.data.description}\n\n` : '';
  return `# ${page.data.title}\n\n${description}Source: ${absolute(page.url)}\n\n${body}\n`;
}

export async function renderFullDocs(pages: DocsMarkdownPage[], trees: LocaleTrees): Promise<string> {
  const ordered = (['th', 'en'] as const).flatMap((locale) =>
    getSections(
      trees[locale],
      pages.filter((page) => getLocale(page) === locale),
      LOCALE_COPY[locale].overview,
    ).flatMap((section) => section.pages),
  );
  const content = await Promise.all(ordered.map(renderPageMarkdown));
  return content.map((item) => item.trim()).join('\n\n---\n\n') + '\n';
}

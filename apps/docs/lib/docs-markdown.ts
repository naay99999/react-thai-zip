export type DocsMarkdownPage = {
  url: string;
  locale?: string;
  data: {
    title: string;
    description?: string;
    getText: (type: 'processed') => Promise<string>;
  };
};

export function getPageMarkdownUrl(page: Pick<DocsMarkdownPage, 'url'>): string {
  const url = page.url.replace(/\/$/, '');
  return `${url}${url.endsWith('/docs') ? '/index' : ''}.md`;
}

export function renderDocsIndex(pages: DocsMarkdownPage[]): string {
  const sections = [
    '# react-thaizip documentation',
    '',
    '> Scaffold Thai address components into React or Next.js projects with the react-thaizip CLI.',
    '',
    '[Full documentation](/llms-full.txt)',
  ];

  for (const [url, label] of [
    ['/docs/guides/using-with-ai', 'AI usage guide (ไทย)'],
    ['/en/docs/guides/using-with-ai', 'AI usage guide (English)'],
  ] as const) {
    const page = pages.find((item) => item.url === url);
    if (page) sections.push(`[${label}](${getPageMarkdownUrl(page)})`);
  }

  for (const [locale, heading] of [['th', 'ไทย'], ['en', 'English']] as const) {
    sections.push('', `## ${heading}`, '');
    for (const page of pages.filter((item) => item.locale === locale)) {
      const description = page.data.description ? `: ${page.data.description}` : '';
      sections.push(`- [${page.data.title}](${getPageMarkdownUrl(page)})${description}`);
    }
  }

  return `${sections.join('\n')}\n`;
}

export async function renderPageMarkdown(page: DocsMarkdownPage): Promise<string> {
  const body = (await page.data.getText('processed')).trim();
  const description = page.data.description ? `> ${page.data.description}\n\n` : '';
  return `# ${page.data.title}\n\n${description}Source: ${page.url}\n\n${body}\n`;
}

export async function renderFullDocs(pages: DocsMarkdownPage[]): Promise<string> {
  const content = await Promise.all(pages.map(renderPageMarkdown));
  return content.map((item) => item.trim()).join('\n\n---\n\n') + '\n';
}

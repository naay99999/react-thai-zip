import type { ReactNode } from 'react';
import { I18nProvider } from 'fumadocs-ui/contexts/i18n';
import { i18nProvider } from 'fumadocs-ui/i18n';
import { translations } from '~/lib/layout.shared';

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  return <I18nProvider {...i18nProvider(translations, lang)}>{children}</I18nProvider>;
}
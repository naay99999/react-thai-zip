import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { uiTranslations } from 'fumadocs-ui/i18n';
import { i18n } from './i18n';

export const translations = i18n
  .translations()
  .extend(uiTranslations())
  .add({
    th: {
      displayName: 'ไทย',
      'Search(search trigger)': 'ค้นหาเอกสาร',
    },
    en: {
      displayName: 'English',
    },
  });

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: 'react-thaizip',
    },
    links: [
      {
        text: 'Core API',
        url: 'https://naay99999.github.io/thai-zip/',
        external: true,
      },
    ],
    githubUrl: 'https://github.com/naay99999/react-thai-zip',
  };
}

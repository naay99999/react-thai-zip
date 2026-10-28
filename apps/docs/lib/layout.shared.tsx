import type { BaseLayoutProps } from '@fumadocs/base-ui/layouts/shared';
import { uiTranslations } from '@fumadocs/base-ui/i18n';
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
      title: 'thaizip',
    },
    githubUrl: 'https://github.com/naay99999/thai-zip',
  };
}

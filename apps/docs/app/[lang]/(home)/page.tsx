import Link from 'next/link';
import { HomeLayout } from '@fumadocs/base-ui/layouts/home';
import { baseOptions } from '~/lib/layout.shared';
import { ComponentPreview } from '~/components/component-preview';
import { i18n } from '~/lib/i18n';

const copy = {
  th: {
    tagline: 'ค้นหาที่อยู่ไทยแบบ fuzzy ด้วยตำบล อำเภอ จังหวัด หรือรหัสไปรษณีย์ ทั้งภาษาไทยและอังกฤษ',
    core: 'เริ่มใช้ thaizip',
    react: 'คอมโพเนนต์ React',
    tryTitle: 'ลองค้นหา',
    tryBody:
      'ตัวอย่างนี้คือ ThaiAddressAutocomplete ที่ react-thaizip คัดลอกลงโปรเจกต์ของคุณ ทำงานบน thaizip กด "ดูโค้ด" เพื่อดูโค้ด',
  },
  en: {
    tagline: 'Fuzzy Thai address search by sub-district, district, province, or postal code, in Thai or English',
    core: 'Get started with thaizip',
    react: 'React components',
    tryTitle: 'Try it',
    tryBody:
      'This is the ThaiAddressAutocomplete that react-thaizip copies into your project, built on thaizip. Select "View Code" to see the code.',
  },
} as const;

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const c = copy[lang === 'en' ? 'en' : 'th'];
  const prefix = lang === 'en' ? '/en' : '';

  return (
    <HomeLayout {...baseOptions()}>
      <section className="container mx-auto flex flex-col items-center gap-4 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight">thaizip</h1>
        <p className="max-w-xl text-lg text-fd-muted-foreground">{c.tagline}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href={`${prefix}/docs`}
            className="rounded-lg bg-fd-primary px-5 py-2.5 font-medium text-fd-primary-foreground"
          >
            {c.core}
          </Link>
          <Link
            href={`${prefix}/docs/react`}
            className="rounded-lg border px-5 py-2.5 font-medium hover:bg-fd-accent"
          >
            {c.react}
          </Link>
        </div>
      </section>
      <section className="container mx-auto max-w-3xl pb-20">
        <h2 className="mb-4 text-xl font-semibold">{c.tryTitle}</h2>
        <p className="mb-4 text-sm text-fd-muted-foreground">{c.tryBody}</p>
        {lang === 'en' ? (
          <ComponentPreview name="autocomplete-en" lang="en" />
        ) : (
          <ComponentPreview name="autocomplete-demo" />
        )}
      </section>
    </HomeLayout>
  );
}

export function generateStaticParams() {
  return i18n.languages.map((lang) => ({ lang }));
}

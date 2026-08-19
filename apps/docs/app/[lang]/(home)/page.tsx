import Link from 'next/link';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '~/lib/layout.shared';
import AutocompleteDemo from '~/components/demos/AutocompleteDemo';

const copy = {
  th: {
    tagline: 'Scaffold คอมโพเนนต์ autocomplete และ cascade ที่คุณเป็นเจ้าของโค้ดเอง',
    description: 'เพิ่มคอมโพเนนต์ที่อยู่ไทยพร้อมใช้ให้โปรเจกต์ React และ Next.js',
    cta: 'เริ่มต้นใช้งาน',
    tryTitle: 'ลองคอมโพเนนต์จริง',
    tryBody:
      'ตัวอย่างนี้คือ ThaiAddressAutocomplete จาก scaffold มาตรฐานของ react-thaizip ไม่ใช่สำเนาที่เขียนขึ้นสำหรับเว็บเอกสาร เมื่อเพิ่มลงโปรเจกต์แล้ว คุณเป็นเจ้าของซอร์สโค้ดและปรับแต่งได้เต็มที่',
  },
  en: {
    tagline: 'Scaffold autocomplete and cascade components whose code you own',
    description: 'Ready-to-use Thai address components for React and Next.js projects',
    cta: 'Get Started',
    tryTitle: 'Try the real component',
    tryBody:
      'This example is the ThaiAddressAutocomplete from the standard react-thaizip scaffold, not a copy written for this site. Once added to your project, you own the source and can customize it freely.',
  },
} as const;

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const c = copy[lang === 'en' ? 'en' : 'th'];
  const docsHref = lang === 'en' ? '/en/docs/getting-started' : '/docs/getting-started';

  return (
    <HomeLayout {...baseOptions()}>
      <section className="container flex flex-col items-center gap-4 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight">react-thaizip</h1>
        <p className="max-w-xl text-lg text-fd-muted-foreground">{c.tagline}</p>
        <Link
          href={docsHref}
          className="rounded-lg bg-fd-primary px-5 py-2.5 font-medium text-fd-primary-foreground"
        >
          {c.cta}
        </Link>
      </section>
      <section className="container max-w-3xl pb-20">
        <h2 className="mb-4 text-xl font-semibold">{c.tryTitle}</h2>
        <p className="mb-4 text-sm text-fd-muted-foreground">{c.tryBody}</p>
        <AutocompleteDemo locale={lang === 'en' ? 'en' : 'th'} />
      </section>
    </HomeLayout>
  );
}
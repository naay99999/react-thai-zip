import type { ReactNode } from 'react';
import { RootProvider } from '@fumadocs/base-ui/provider/next';
import { DocsStyleProvider } from '~/components/docs-style';
import './global.css';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <RootProvider>
          <DocsStyleProvider>{children}</DocsStyleProvider>
        </RootProvider>
      </body>
    </html>
  );
}
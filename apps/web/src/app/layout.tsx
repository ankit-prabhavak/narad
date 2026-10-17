import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Noto_Sans_Devanagari, Rozha_One } from 'next/font/google';
import Link from 'next/link';
import { Suspense, type ReactNode } from 'react';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Wordmark } from '@/components/wordmark';
import './globals.css';

const sans = Inter({ subsets: ['latin'], variable: '--font-sans-latin', display: 'swap' });
const sansDev = Noto_Sans_Devanagari({
  subsets: ['devanagari', 'latin'],
  variable: '--font-sans-dev',
  display: 'swap',
});
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono-latin', display: 'swap' });
const wordmark = Rozha_One({
  subsets: ['devanagari', 'latin'],
  weight: '400',
  variable: '--font-wordmark',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'NARAD', template: '%s | NARAD' },
  description: 'A multilingual social network for India.',
};

function HeaderFallback() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-6xl items-center px-5 py-3.5">
        <Link href="/" aria-label="NARAD home">
          <Wordmark />
        </Link>
      </div>
    </header>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const fonts = [sans, sansDev, mono, wordmark].map((f) => f.variable).join(' ');
  return (
    <html lang="en" className={fonts}>
      <body className="flex min-h-screen flex-col">
        <Suspense fallback={<HeaderFallback />}>
          <SiteHeader />
        </Suspense>
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}

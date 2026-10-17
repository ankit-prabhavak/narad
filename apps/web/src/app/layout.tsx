import type { Metadata } from 'next';
import { Inter, Noto_Sans_Devanagari } from 'next/font/google';
import Link from 'next/link';
import { Suspense, type ReactNode } from 'react';
import { Logo } from '@/components/logo';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const devanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-devanagari',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'NARAD', template: '%s | NARAD' },
  description: "India's conversations, connected. A multilingual social network for India.",
};

function HeaderFallback() {
  return (
    <header className="border-b border-border bg-bg">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" aria-label="NARAD home">
          <Logo />
        </Link>
      </div>
    </header>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable + ' ' + devanagari.variable}>
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

'use client';

import type { MeResponse } from '@narad/contracts';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, clearCsrf } from '@/lib/api';
import { Wordmark } from './wordmark';

const quiet = 'text-text-muted transition-colors hover:text-text';

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<MeResponse | null | undefined>(undefined);

  useEffect(() => {
    api<MeResponse>('GET', '/auth/me')
      .then(setUser)
      .catch(() => setUser(null));
  }, [pathname]);

  async function logout() {
    await api('POST', '/auth/logout').catch(() => undefined);
    clearCsrf();
    setUser(null);
    router.push('/');
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
        <div className="flex items-center gap-8">
          <Link href="/" aria-label="NARAD home">
            <Wordmark />
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-5 text-sm md:flex">
            {user ? (
              <>
                <Link href="/home" className={quiet}>
                  Home
                </Link>
                <Link href="/bookmarks" className={quiet}>
                  Bookmarks
                </Link>
              </>
            ) : (
              <>
                <Link href="/#how" className={quiet}>
                  How it works
                </Link>
                <Link href="/#languages" className={quiet}>
                  Languages
                </Link>
                <Link href="/#faq" className={quiet}>
                  FAQ
                </Link>
              </>
            )}
            <Link href="/guidelines" className={quiet}>
              Guidelines
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm">
          {user === undefined ? null : user ? (
            <>
              <Link href="/home" className={quiet + ' md:hidden'}>
                Home
              </Link>
              <Link href="/bookmarks" className={quiet + ' md:hidden'}>
                Bookmarks
              </Link>
              <Link href={'/u/' + user.handle} className={quiet}>
                @{user.handle}
              </Link>
              <Link href="/settings" className={quiet}>
                Settings
              </Link>
              <button onClick={logout} className={quiet}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={quiet}>
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-btn px-3.5 py-1.5 font-medium text-btn-text transition-opacity hover:opacity-85"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

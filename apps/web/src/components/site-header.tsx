'use client';

import type { MeResponse } from '@narad/contracts';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, clearCsrf } from '@/lib/api';
import { Logo } from './logo';

const linkClass = 'rounded-md px-2 py-1 hover:bg-bg-secondary';
const joinClass = 'rounded-md bg-accent-strong px-3 py-1.5 font-medium text-white hover:opacity-90';

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
    <header className="border-b border-border bg-bg">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" aria-label="NARAD home">
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 text-sm sm:flex">
          <Link href="/explore" className={linkClass}>
            Explore
          </Link>
          <Link href="/#languages" className={linkClass}>
            Languages
          </Link>
          <Link href="/about" className={linkClass}>
            About
          </Link>
        </nav>

        <div className="flex items-center gap-1 text-sm">
          {user === undefined ? null : user ? (
            <>
              <Link href={'/u/' + user.handle} className={linkClass}>
                Profile
              </Link>
              <Link href="/settings" className={linkClass}>
                Settings
              </Link>
              <button onClick={logout} className={linkClass}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={linkClass}>
                Sign in
              </Link>
              <Link href="/register" className={joinClass}>
                Join NARAD
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

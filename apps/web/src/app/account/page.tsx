'use client';

import type { MeResponse } from '@narad/contracts';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/button';
import { ApiRequestError, api, clearCsrf } from '@/lib/api';

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  useEffect(() => {
    api<MeResponse>('GET', '/auth/me')
      .then(setUser)
      .catch((err: unknown) => {
        if (err instanceof ApiRequestError && err.status === 401) router.replace('/login');
        else setError('Could not load your account.');
      });
  }, [router]);

  async function logout() {
    await api('POST', '/auth/logout');
    clearCsrf();
    router.replace('/login');
  }

  async function resend() {
    setResendMsg(null);
    try {
      await api('POST', '/auth/resend-verification');
      setResendMsg('Verification email sent. Check your inbox.');
    } catch (err) {
      setResendMsg(err instanceof ApiRequestError ? err.message : 'Could not send the email.');
    }
  }

  return (
    <AuthShell title="Your account">
      {error ? (
        <p role="alert" className="text-danger">
          {error}
        </p>
      ) : null}
      {!user && !error ? <p className="text-text-muted">Loading...</p> : null}
      {user ? (
        <div className="space-y-4">
          <p>
            Signed in as <strong>{user.displayName}</strong> (@{user.handle})
          </p>

          {!user.emailVerified ? (
            <div className="rounded-md border border-border bg-bg-secondary p-3 text-sm">
              <p>Your email is not verified yet.</p>
              <button onClick={resend} className="mt-2 text-accent-strong underline">
                Resend verification email
              </button>
              {resendMsg ? (
                <p role="status" className="mt-2">
                  {resendMsg}
                </p>
              ) : null}
            </div>
          ) : null}

          <p className="text-sm">
            <Link href={`/u/${user.handle}`} className="text-accent-strong underline">
              View profile
            </Link>
            {' \u00b7 '}
            <Link href="/settings" className="text-accent-strong underline">
              Settings
            </Link>
          </p>

          <Button variant="secondary" onClick={logout}>
            Sign out
          </Button>
        </div>
      ) : null}
    </AuthShell>
  );
}

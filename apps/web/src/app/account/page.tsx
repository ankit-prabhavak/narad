'use client';

import type { PublicUser } from '@narad/contracts';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/button';
import { ApiRequestError, api, clearCsrf } from '@/lib/api';

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<PublicUser>('GET', '/auth/me')
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
          <Button variant="secondary" onClick={logout}>
            Sign out
          </Button>
        </div>
      ) : null}
    </AuthShell>
  );
}

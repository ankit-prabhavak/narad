'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/button';
import { ApiRequestError, api } from '@/lib/api';

type State = 'idle' | 'working' | 'done' | 'failed';

function VerifyForm() {
  const token = useSearchParams().get('token');
  const [state, setState] = useState<State>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function verify() {
    if (!token) return;
    setState('working');
    try {
      await api('POST', '/auth/verify-email', { token }, { csrf: false });
      setState('done');
    } catch (err) {
      setMessage(err instanceof ApiRequestError ? err.message : 'Could not verify your email.');
      setState('failed');
    }
  }

  if (!token) {
    return (
      <p role="alert" className="text-danger">
        This link is incomplete. Please use the link from your email.
      </p>
    );
  }
  if (state === 'done') {
    return (
      <div className="space-y-4">
        <p>Your email is verified.</p>
        <Link href="/account" className="text-accent-strong underline">
          Go to your account
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <p>Confirm that this is your email address.</p>
      {state === 'failed' ? (
        <p role="alert" className="text-sm text-danger">
          {message}
        </p>
      ) : null}
      <Button onClick={verify} disabled={state === 'working'}>
        {state === 'working' ? 'Verifying...' : 'Verify my email'}
      </Button>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <AuthShell title="Verify your email">
      <Suspense fallback={<p className="text-text-muted">Loading...</p>}>
        <VerifyForm />
      </Suspense>
    </AuthShell>
  );
}

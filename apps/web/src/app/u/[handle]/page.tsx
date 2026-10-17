'use client';

import type { PublicProfile } from '@narad/contracts';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/button';
import { ApiRequestError, api } from '@/lib/api';

function Profile() {
  const { handle } = useParams<{ handle: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchProfile = useCallback(
    () => api<PublicProfile>('GET', `/users/${encodeURIComponent(handle)}`),
    [handle],
  );

  useEffect(() => {
    fetchProfile()
      .then(setProfile)
      .catch((err: unknown) => {
        setError(
          err instanceof ApiRequestError && err.status === 404
            ? 'No such user.'
            : 'Could not load this profile.',
        );
      });
  }, [fetchProfile]);

  async function act(method: 'POST' | 'PUT' | 'DELETE', path: string) {
    setBusy(true);
    setError(null);
    try {
      await api(method, `/users/${encodeURIComponent(handle)}${path}`);
      setProfile(await fetchProfile());
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'That did not work. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (error && !profile) {
    return (
      <p role="alert" className="text-danger">
        {error}
      </p>
    );
  }
  if (!profile) return <p className="text-text-muted">Loading...</p>;

  const v = profile.viewer;
  const followLabel = v?.following ? 'Following' : v?.requested ? 'Requested' : 'Follow';

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{profile.displayName}</h1>
        <p className="text-text-muted">
          @{profile.handle}
          {profile.isPrivate ? ' \u00b7 Private account' : ''}
        </p>
      </div>
      {profile.bio ? <p>{profile.bio}</p> : null}
      <p className="text-sm text-text-muted">
        <strong className="text-text">{profile.followersCount}</strong> followers
        {' \u00b7 '}
        <strong className="text-text">{profile.followingCount}</strong> following
      </p>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      {v === null ? (
        <Link href="/login" className="text-accent-strong underline">
          Sign in to follow
        </Link>
      ) : v.isSelf ? (
        <Link href="/settings" className="text-accent-strong underline">
          Edit your profile
        </Link>
      ) : (
        <div className="flex flex-wrap gap-2">
          {!v.blocking ? (
            <Button
              disabled={busy}
              variant={v.following || v.requested ? 'secondary' : 'primary'}
              onClick={() => act(v.following || v.requested ? 'DELETE' : 'POST', '/follow')}
            >
              {followLabel}
            </Button>
          ) : null}
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => act(v.muting ? 'DELETE' : 'PUT', '/mute')}
          >
            {v.muting ? 'Unmute' : 'Mute'}
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => act(v.blocking ? 'DELETE' : 'PUT', '/block')}
          >
            {v.blocking ? 'Unblock' : 'Block'}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="rounded-md border border-border bg-card p-6">
        <Suspense fallback={<p className="text-text-muted">Loading...</p>}>
          <Profile />
        </Suspense>
      </div>
    </div>
  );
}

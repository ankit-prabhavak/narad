'use client';

import type { PublicProfile } from '@narad/contracts';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/button';
import { PostList } from '@/components/post-list';
import { usePosts } from '@/hooks/use-posts';
import { ApiRequestError, api } from '@/lib/api';

function ProfilePosts({ profile }: { profile: PublicProfile }) {
  const posts = usePosts('/users/' + encodeURIComponent(profile.handle) + '/posts');
  const isSelf = profile.viewer?.isSelf === true;
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-xl">Posts</h2>
      <PostList
        posts={posts}
        currentUserId={isSelf ? profile.id : null}
        empty={isSelf ? 'You have not posted yet. Write something on Home.' : 'No posts yet.'}
        privateMessage="This account is private. Follow it to see its posts."
      />
    </section>
  );
}

function Profile() {
  const { handle } = useParams<{ handle: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [postsKey, setPostsKey] = useState(0);

  const fetchProfile = useCallback(
    () => api<PublicProfile>('GET', '/users/' + encodeURIComponent(handle)),
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
      await api(method, '/users/' + encodeURIComponent(handle) + path);
      setProfile(await fetchProfile());
      setPostsKey((k) => k + 1);
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
    <div>
      <div className="rounded-lg border border-border bg-card p-5">
        <h1 className="text-3xl">{profile.displayName}</h1>
        <p className="text-text-muted">
          @{profile.handle}
          {profile.isPrivate ? ' \u00b7 Private account' : ''}
        </p>
        {profile.bio ? <p className="mt-3 whitespace-pre-wrap">{profile.bio}</p> : null}
        <p className="mt-3 text-sm text-text-muted">
          <strong className="text-text">{profile.followersCount}</strong> followers
          {' \u00b7 '}
          <strong className="text-text">{profile.followingCount}</strong> following
        </p>

        {error ? (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <div className="mt-4">
          {v === null ? (
            <Link href="/login" className="underline underline-offset-4">
              Sign in to follow
            </Link>
          ) : v.isSelf ? (
            <Link href="/settings" className="underline underline-offset-4">
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
      </div>

      <ProfilePosts
        key={profile.handle + '-' + postsKey + '-' + (v?.following ? 'f' : 'n')}
        profile={profile}
      />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <Suspense fallback={<p className="text-text-muted">Loading...</p>}>
        <Profile />
      </Suspense>
    </div>
  );
}

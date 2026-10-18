'use client';

import { Handle, type MeResponse } from '@narad/contracts';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/button';
import { Composer } from '@/components/composer';
import { PostList } from '@/components/post-list';
import { usePosts } from '@/hooks/use-posts';
import { api } from '@/lib/api';

function GoToProfile() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  function go(e: FormEvent) {
    e.preventDefault();
    const parsed = Handle.safeParse(value.replace(/^@/, ''));
    if (!parsed.success) {
      setError('Handles are 3 to 20 letters, numbers or underscores.');
      return;
    }
    router.push('/u/' + parsed.data);
  }

  return (
    <form onSubmit={go} className="rounded-lg border border-border bg-bg-secondary p-4">
      <label htmlFor="goto" className="block text-sm font-medium">
        Go to a profile
      </label>
      <p className="text-sm text-text-muted">
        Search is coming. For now, enter someone&apos;s handle.
      </p>
      <div className="mt-2 flex gap-2">
        <input
          id="goto"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="@handle"
          className="min-w-0 flex-1 rounded-md border border-border bg-card px-3 py-2"
        />
        <Button type="submit" variant="secondary">
          Go
        </Button>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </form>
  );
}

function HomeContent({ me }: { me: MeResponse }) {
  const router = useRouter();
  const posts = usePosts('/feed/home');

  useEffect(() => {
    if (posts.status === 'signin') router.replace('/login');
  }, [posts.status, router]);

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-5 py-8">
      <h1 className="text-2xl">Home</h1>
      <Composer onPosted={posts.prepend} />
      <PostList
        posts={posts}
        currentUserId={me.id}
        empty="Nothing here yet. Write your first post above, or follow people to see theirs."
      />
      <GoToProfile />
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    api<MeResponse>('GET', '/auth/me')
      .then(setMe)
      .catch(() => router.replace('/login'));
  }, [router]);

  if (!me) return <div className="mx-auto max-w-2xl px-5 py-10 text-text-muted">Loading...</div>;
  return <HomeContent me={me} />;
}

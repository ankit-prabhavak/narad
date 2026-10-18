'use client';

import type { MeResponse } from '@narad/contracts';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PostList } from '@/components/post-list';
import { usePosts } from '@/hooks/use-posts';
import { api } from '@/lib/api';

function Bookmarks({ me }: { me: MeResponse }) {
  const posts = usePosts('/me/bookmarks');
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-5 py-8">
      <h1 className="text-2xl">Bookmarks</h1>
      <PostList posts={posts} currentUserId={me.id} empty="You have not bookmarked anything yet." />
    </div>
  );
}

export default function BookmarksPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    api<MeResponse>('GET', '/auth/me')
      .then(setMe)
      .catch(() => router.replace('/login'));
  }, [router]);

  if (!me) return <div className="mx-auto max-w-2xl px-5 py-10 text-text-muted">Loading...</div>;
  return <Bookmarks me={me} />;
}

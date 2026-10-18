'use client';

import type { ReactNode } from 'react';
import type { PostsState } from '@/hooks/use-posts';
import { Button } from './button';
import { PostCard } from './post-card';

function Skeleton() {
  return (
    <div
      className="animate-pulse space-y-3 rounded-lg border border-border bg-card p-4"
      aria-hidden="true"
    >
      <div className="h-3 w-40 rounded bg-bg-secondary" />
      <div className="h-4 w-full rounded bg-bg-secondary" />
      <div className="h-4 w-2/3 rounded bg-bg-secondary" />
    </div>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-border p-6 text-center text-text-muted">{children}</p>
  );
}

export function PostList({
  posts,
  currentUserId,
  empty,
  privateMessage = 'This account is private.',
}: {
  posts: PostsState;
  currentUserId: string | null;
  empty: ReactNode;
  privateMessage?: string;
}) {
  if (posts.status === 'loading') {
    return (
      <div className="space-y-3" role="status" aria-label="Loading posts">
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </div>
    );
  }
  if (posts.status === 'private') return <Notice>{privateMessage}</Notice>;
  if (posts.status === 'missing') return <Notice>Nothing to show here.</Notice>;
  if (posts.status === 'signin') return <Notice>Please sign in to see this.</Notice>;
  if (posts.status === 'error') {
    return (
      <div className="space-y-3 rounded-lg border border-border p-6 text-center">
        <p role="alert" className="text-danger">
          Could not load posts.
        </p>
        <Button variant="secondary" onClick={posts.retry}>
          Try again
        </Button>
      </div>
    );
  }
  if (posts.items.length === 0) return <Notice>{empty}</Notice>;

  return (
    <div className="space-y-3">
      {posts.items.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          isOwn={post.author.id === currentUserId}
          onChanged={posts.replace}
          onDeleted={posts.remove}
        />
      ))}
      {posts.hasMore ? (
        <div className="pt-2 text-center">
          <Button variant="secondary" onClick={posts.loadMore} disabled={posts.loadingMore}>
            {posts.loadingMore ? 'Loading...' : 'Load more'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

'use client';

import type { PostDto, PostPage } from '@narad/contracts';
import { useCallback, useEffect, useState } from 'react';
import { ApiRequestError, api } from '@/lib/api';

export type PostsStatus = 'loading' | 'ready' | 'error' | 'private' | 'missing' | 'signin';

function statusFor(err: unknown): PostsStatus {
  if (err instanceof ApiRequestError) {
    if (err.status === 401) return 'signin';
    if (err.status === 403) return 'private';
    if (err.status === 404) return 'missing';
  }
  return 'error';
}

/** Loads a cursor-paginated list of posts from `base`. Remount with a `key` to reset. */
export function usePosts(base: string) {
  const [items, setItems] = useState<PostDto[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [status, setStatus] = useState<PostsStatus>('loading');
  const [loadingMore, setLoadingMore] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api<PostPage>('GET', base + '?limit=20')
      .then((page) => {
        if (cancelled) return;
        setItems(page.items);
        setNext(page.nextCursor);
        setStatus('ready');
      })
      .catch((err: unknown) => {
        if (!cancelled) setStatus(statusFor(err));
      });
    return () => {
      cancelled = true;
    };
  }, [base, attempt]);

  const loadMore = useCallback(async () => {
    if (!next) return;
    setLoadingMore(true);
    try {
      const page = await api<PostPage>(
        'GET',
        base + '?limit=20&cursor=' + encodeURIComponent(next),
      );
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...page.items.filter((p) => !seen.has(p.id))];
      });
      setNext(page.nextCursor);
    } catch {
      setStatus('error');
    } finally {
      setLoadingMore(false);
    }
  }, [base, next]);

  return {
    items,
    status,
    hasMore: next !== null,
    loadingMore,
    loadMore,
    retry: () => {
      setStatus('loading');
      setAttempt((a) => a + 1);
    },
    prepend: (post: PostDto) => setItems((prev) => [post, ...prev]),
    replace: (post: PostDto) => setItems((prev) => prev.map((p) => (p.id === post.id ? post : p))),
    remove: (id: string) => setItems((prev) => prev.filter((p) => p.id !== id)),
  };
}

export type PostsState = ReturnType<typeof usePosts>;

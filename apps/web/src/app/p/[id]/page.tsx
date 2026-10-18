'use client';

import type { MeResponse, PostDto } from '@narad/contracts';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Composer } from '@/components/composer';
import { PostCard } from '@/components/post-card';
import { PostList } from '@/components/post-list';
import { usePosts } from '@/hooks/use-posts';
import { api } from '@/lib/api';

type Status = 'loading' | 'ready' | 'missing' | 'error';

function Thread() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<PostDto | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [me, setMe] = useState<MeResponse | null>(null);
  const replies = usePosts('/posts/' + encodeURIComponent(id) + '/replies');

  useEffect(() => {
    let cancelled = false;
    api<PostDto>('GET', '/posts/' + encodeURIComponent(id))
      .then((p) => {
        if (cancelled) return;
        setPost(p);
        setStatus('ready');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const code = (err as { status?: number }).status;
        setStatus(code === 404 ? 'missing' : 'error');
      });
    api<MeResponse>('GET', '/auth/me')
      .then((u) => {
        if (!cancelled) setMe(u);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (status === 'loading') return <p className="text-text-muted">Loading...</p>;
  if (status === 'missing') return <p className="text-text-muted">This post is not available.</p>;
  if (status === 'error' || !post) {
    return (
      <p role="alert" className="text-danger">
        Could not load this post.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {post.parentId ? (
        <Link
          href={'/p/' + post.parentId}
          className="text-sm text-text-muted underline underline-offset-4"
        >
          View the post this replies to
        </Link>
      ) : null}
      <PostCard
        post={post}
        isOwn={me?.id === post.author.id}
        onChanged={setPost}
        onDeleted={() => router.push('/home')}
      />

      <h2 className="pt-2 text-xl">Comments</h2>
      {me ? (
        <Composer
          endpoint={'/posts/' + encodeURIComponent(id) + '/replies'}
          placeholder="Write a comment"
          submitLabel="Comment"
          onPosted={(reply) => {
            replies.append(reply);
            setPost({ ...post, replyCount: post.replyCount + 1 });
          }}
        />
      ) : (
        <p className="text-sm text-text-muted">
          <Link href="/login" className="underline underline-offset-4">
            Sign in
          </Link>{' '}
          to comment.
        </p>
      )}
      <PostList
        posts={replies}
        currentUserId={me?.id ?? null}
        empty="No comments yet. Be the first."
      />
    </div>
  );
}

export default function PostPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <Suspense fallback={<p className="text-text-muted">Loading...</p>}>
        <Thread />
      </Suspense>
    </div>
  );
}

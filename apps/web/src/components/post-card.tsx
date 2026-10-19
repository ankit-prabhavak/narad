'use client';

import { EditPostRequest, type PostDto } from '@narad/contracts';
import { Bookmark, Heart, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ApiRequestError, api } from '@/lib/api';
import { graphemeCount, timeAgo } from '@/lib/text';
import { Avatar } from './avatar';
import { Button } from './button';
import { PostImages } from './post-images';

const MAX = 300;

export function PostCard({
  post,
  isOwn,
  onChanged,
  onDeleted,
}: {
  post: PostDto;
  isOwn: boolean;
  onChanged: (post: PostDto) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.text);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const parsed = EditPostRequest.safeParse({ text: draft });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid post.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      onChanged(await api<PostDto>('PATCH', '/posts/' + post.id, parsed.data));
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await api('DELETE', '/posts/' + post.id);
      onDeleted(post.id);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not delete.');
      setBusy(false);
    }
  }

  async function toggle(kind: 'like' | 'bookmark') {
    const viewer = post.viewer;
    if (!viewer) return;
    const on = kind === 'like' ? viewer.liked : viewer.bookmarked;
    setBusy(true);
    setError(null);
    try {
      await api(on ? 'DELETE' : 'PUT', '/posts/' + post.id + '/' + kind);
      onChanged({
        ...post,
        likeCount: kind === 'like' ? post.likeCount + (on ? -1 : 1) : post.likeCount,
        viewer: { ...viewer, [kind === 'like' ? 'liked' : 'bookmarked']: !on },
      });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'That did not work.');
    } finally {
      setBusy(false);
    }
  }

  const remaining = MAX - graphemeCount(draft);
  const action = 'text-sm text-text-muted transition-colors hover:text-text';
  const iconBtn =
    'inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text disabled:opacity-60';
  const viewer = post.viewer;

  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <header className="flex flex-wrap items-baseline gap-x-2 text-sm">
        <Avatar
          url={post.author.avatarUrl}
          name={post.author.displayName}
          size={28}
          className="self-center"
        />
        <Link href={'/u/' + post.author.handle} className="font-semibold hover:underline">
          {post.author.displayName}
        </Link>
        <span className="text-text-muted">@{post.author.handle}</span>
        <span className="text-text-muted" aria-hidden="true">
          ·
        </span>
        <Link
          href={'/p/' + post.id}
          title={new Date(post.createdAt).toLocaleString()}
          className="text-text-muted hover:underline"
        >
          <time dateTime={post.createdAt}>{timeAgo(post.createdAt)}</time>
        </Link>
        {post.editedAt ? <span className="text-text-muted">· edited</span> : null}
        <span className="ml-auto rounded border border-border px-1.5 font-mono text-xs text-text-muted">
          {post.language}
        </span>
      </header>

      {editing ? (
        <div className="mt-2 space-y-2">
          <label htmlFor={'edit-' + post.id} className="sr-only">
            Edit post
          </label>
          <textarea
            id={'edit-' + post.id}
            lang={post.language}
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full rounded-md border border-border bg-bg p-2 text-lg"
          />
          <div className="flex items-center gap-3">
            <Button onClick={save} disabled={busy || remaining < 0 || draft.trim().length === 0}>
              {busy ? 'Saving...' : 'Save'}
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => {
                setEditing(false);
                setDraft(post.text);
                setError(null);
              }}
            >
              Cancel
            </Button>
            <span
              className={
                'ml-auto font-mono text-sm ' + (remaining < 0 ? 'text-danger' : 'text-text-muted')
              }
            >
              {remaining}
            </span>
          </div>
        </div>
      ) : (
        <p
          lang={post.language}
          className="mt-2 whitespace-pre-wrap break-words text-lg leading-relaxed"
        >
          {post.text}
        </p>
      )}

      {error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {!editing && post.images.length > 0 ? <PostImages images={post.images} /> : null}
      {!editing ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link
            href={'/p/' + post.id}
            className={iconBtn}
            aria-label={post.replyCount + ' comments'}
          >
            <MessageCircle size={18} aria-hidden="true" />
            {post.replyCount}
          </Link>
          <button
            onClick={() => toggle('like')}
            disabled={busy || !viewer}
            aria-pressed={viewer?.liked ?? false}
            aria-label={'Like, ' + post.likeCount + ' likes'}
            title={viewer ? undefined : 'Sign in to like'}
            className={iconBtn + (viewer?.liked ? ' !text-accent' : '')}
          >
            <Heart size={18} aria-hidden="true" fill={viewer?.liked ? 'currentColor' : 'none'} />
            {post.likeCount}
          </button>
          <button
            onClick={() => toggle('bookmark')}
            disabled={busy || !viewer}
            aria-pressed={viewer?.bookmarked ?? false}
            aria-label="Bookmark"
            title={viewer ? undefined : 'Sign in to bookmark'}
            className={iconBtn + (viewer?.bookmarked ? ' !text-accent' : '')}
          >
            <Bookmark
              size={18}
              aria-hidden="true"
              fill={viewer?.bookmarked ? 'currentColor' : 'none'}
            />
          </button>

          {isOwn ? (
            <span className="ml-auto flex items-center gap-4">
              {confirming ? (
                <>
                  <span className="text-sm">Delete this post?</span>
                  <button
                    onClick={remove}
                    disabled={busy}
                    className="text-sm font-semibold text-danger"
                  >
                    Yes, delete
                  </button>
                  <button onClick={() => setConfirming(false)} disabled={busy} className={action}>
                    No
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setEditing(true)} className={action}>
                    Edit
                  </button>
                  <button onClick={() => setConfirming(true)} className={action}>
                    Delete
                  </button>
                </>
              )}
            </span>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

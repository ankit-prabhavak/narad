'use client';

import { EditPostRequest, type PostDto } from '@narad/contracts';
import Link from 'next/link';
import { useState } from 'react';
import { ApiRequestError, api } from '@/lib/api';
import { graphemeCount, timeAgo } from '@/lib/text';
import { Button } from './button';

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

  const remaining = MAX - graphemeCount(draft);
  const action = 'text-sm text-text-muted transition-colors hover:text-text';

  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <header className="flex flex-wrap items-baseline gap-x-2 text-sm">
        <Link href={'/u/' + post.author.handle} className="font-semibold hover:underline">
          {post.author.displayName}
        </Link>
        <span className="text-text-muted">@{post.author.handle}</span>
        <span className="text-text-muted" aria-hidden="true">
          ·
        </span>
        <time
          dateTime={post.createdAt}
          title={new Date(post.createdAt).toLocaleString()}
          className="text-text-muted"
        >
          {timeAgo(post.createdAt)}
        </time>
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

      {isOwn && !editing ? (
        <div className="mt-3 flex items-center gap-4">
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
        </div>
      ) : null}
    </article>
  );
}

'use client';

import { CreatePostRequest, type PostDto, type PostLanguage } from '@narad/contracts';
import { type FormEvent, useState } from 'react';
import { ApiRequestError, api } from '@/lib/api';
import { graphemeCount } from '@/lib/text';
import { Button } from './button';

const MAX = 300;

export function Composer({ onPosted }: { onPosted: (post: PostDto) => void }) {
  const [text, setText] = useState('');
  const [language, setLanguage] = useState<PostLanguage>('en');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = MAX - graphemeCount(text);
  const blank = text.trim().length === 0;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = CreatePostRequest.safeParse({ text, language });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid post.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const post = await api<PostDto>('POST', '/posts', parsed.data);
      setText('');
      onPosted(post);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not post. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-border bg-card p-4">
      <label htmlFor="composer" className="sr-only">
        Write a post
      </label>
      <textarea
        id="composer"
        lang={language}
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={language === 'hi' ? 'आप क्या सोच रहे हैं?' : 'What is on your mind?'}
        className="w-full resize-none bg-transparent text-lg outline-none placeholder:text-text-muted"
      />
      {error ? (
        <p role="alert" className="mb-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
        <div className="flex items-center gap-2 text-sm">
          <label htmlFor="post-language" className="text-text-muted">
            Language
          </label>
          <select
            id="post-language"
            value={language}
            onChange={(e) => setLanguage(e.target.value as PostLanguage)}
            className="rounded-md border border-border bg-card px-2 py-1"
          >
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={'font-mono text-sm ' + (remaining < 0 ? 'text-danger' : 'text-text-muted')}
            aria-live="polite"
          >
            {remaining}
          </span>
          <Button type="submit" disabled={busy || blank || remaining < 0}>
            {busy ? 'Posting...' : 'Post'}
          </Button>
        </div>
      </div>
    </form>
  );
}

'use client';

import { CreatePostRequest, type PostDto, type PostLanguage } from '@narad/contracts';
import { ImagePlus, X } from 'lucide-react';
import Image from 'next/image';
import { type ChangeEvent, type FormEvent, useState } from 'react';
import { api } from '@/lib/api';
import { graphemeCount } from '@/lib/text';
import { Button } from './button';

const MAX = 300;
const MAX_IMAGES = 4;
const MAX_BYTES = 5 * 1024 * 1024;

interface Attached {
  id: string;
  url: string;
  width: number;
  height: number;
}

export function Composer({
  onPosted,
  endpoint = '/posts',
  placeholder,
  submitLabel = 'Post',
}: {
  onPosted: (post: PostDto) => void;
  endpoint?: string;
  placeholder?: string;
  submitLabel?: string;
}) {
  const [text, setText] = useState('');
  const [language, setLanguage] = useState<PostLanguage>('en');
  const [images, setImages] = useState<Attached[]>([]);
  const [uploading, setUploading] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = MAX - graphemeCount(text);
  const empty = text.trim().length === 0 && images.length === 0;
  const full = images.length + uploading >= MAX_IMAGES;
  const hint =
    placeholder ?? (language === 'hi' ? 'आप क्या सोच रहे हैं?' : 'What is on your mind?');

  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    const room = MAX_IMAGES - images.length - uploading;
    const chosen = files.slice(0, Math.max(room, 0));
    setError(files.length > chosen.length ? 'You can attach up to 4 images.' : null);
    if (chosen.length === 0) return;

    setUploading((n) => n + chosen.length);
    for (const file of chosen) {
      try {
        if (file.size > MAX_BYTES) throw new Error('Images must be 5 MB or smaller.');
        const form = new FormData();
        form.append('file', file);
        const img = await api<Attached>('POST', '/media/images', form);
        setImages((prev) => [...prev, img]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not upload the image.');
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  function removeImage(id: string) {
    setImages((prev) => prev.filter((i) => i.id !== id));
    api('DELETE', '/media/images/' + id).catch(() => undefined);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = CreatePostRequest.safeParse({
      text,
      language,
      imageIds: images.map((i) => i.id),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid post.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const post = await api<PostDto>('POST', endpoint, parsed.data);
      setText('');
      setImages([]);
      onPosted(post);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-border bg-card p-4">
      <label htmlFor={'composer-' + endpoint} className="sr-only">
        Write a post
      </label>
      <textarea
        id={'composer-' + endpoint}
        lang={language}
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={hint}
        className="w-full resize-none bg-transparent text-lg outline-none placeholder:text-text-muted"
      />

      {images.length > 0 || uploading > 0 ? (
        <ul className="mb-3 flex flex-wrap gap-2" aria-label="Attached images">
          {images.map((img, i) => (
            <li key={img.id} className="relative">
              <Image
                src={img.url}
                alt={'Attached image ' + (i + 1)}
                width={72}
                height={72}
                unoptimized
                className="h-[72px] w-[72px] rounded-md border border-border object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(img.id)}
                aria-label={'Remove image ' + (i + 1)}
                className="absolute -right-2 -top-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-text-muted hover:text-text"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
          {Array.from({ length: uploading }).map((_, i) => (
            <li
              key={'u' + i}
              role="status"
              aria-label="Uploading image"
              className="h-[72px] w-[72px] animate-pulse rounded-md border border-border bg-bg-secondary"
            />
          ))}
        </ul>
      ) : null}

      {error ? (
        <p role="alert" className="mb-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
        <div className="flex items-center gap-3 text-sm">
          <label
            className={
              'inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-text-muted transition hover:text-text focus-within:outline focus-within:outline-2 focus-within:outline-accent ' +
              (full ? 'pointer-events-none opacity-50' : '')
            }
          >
            <ImagePlus size={16} aria-hidden="true" />
            <span>Image</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={pick}
              disabled={full}
              className="sr-only"
            />
          </label>
          <label htmlFor={'lang-' + endpoint} className="text-text-muted">
            Language
          </label>
          <select
            id={'lang-' + endpoint}
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
          <Button type="submit" disabled={busy || uploading > 0 || empty || remaining < 0}>
            {busy ? 'Posting...' : submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}

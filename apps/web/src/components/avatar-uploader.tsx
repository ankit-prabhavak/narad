'use client';

import type { PublicProfile } from '@narad/contracts';
import { type ChangeEvent, useState } from 'react';
import { ApiRequestError, api } from '@/lib/api';
import { Avatar } from './avatar';
import { Button } from './button';

const MAX_BYTES = 5 * 1024 * 1024;

export function AvatarUploader({
  profile,
  onChange,
}: {
  profile: PublicProfile;
  onChange: (profile: PublicProfile) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError('Image must be 5 MB or smaller.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const r = await api<{ avatarUrl: string }>('PUT', '/me/avatar', form);
      onChange({ ...profile, avatarUrl: r.avatarUrl });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not upload the image.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await api('DELETE', '/me/avatar');
      onChange({ ...profile, avatarUrl: null });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not remove the image.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar url={profile.avatarUrl} name={profile.displayName} size={72} />
      <div className="space-y-2">
        <p className="text-sm font-medium">Profile picture</p>
        <div className="flex flex-wrap items-center gap-2">
          <label
            className={
              'cursor-pointer rounded-md border border-border px-4 py-2 text-sm font-medium transition hover:bg-bg-secondary focus-within:outline focus-within:outline-2 focus-within:outline-accent ' +
              (busy ? 'pointer-events-none opacity-60' : '')
            }
          >
            {busy ? 'Working...' : profile.avatarUrl ? 'Change image' : 'Choose image'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={pick}
              disabled={busy}
              className="sr-only"
            />
          </label>
          {profile.avatarUrl ? (
            <Button variant="secondary" onClick={remove} disabled={busy}>
              Remove
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-text-muted">JPEG, PNG or WebP, up to 5 MB.</p>
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

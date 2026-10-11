'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { type PublicProfile, UpdateProfileRequest, type MeResponse } from '@narad/contracts';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { ApiRequestError, api } from '@/lib/api';

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProfileRequest>({ resolver: zodResolver(UpdateProfileRequest) });

  useEffect(() => {
    api<MeResponse>('GET', '/auth/me')
      .then((me) => api<PublicProfile>('GET', `/users/${me.handle}`))
      .then((p) => {
        setProfile(p);
        reset({ displayName: p.displayName, bio: p.bio });
      })
      .catch((err: unknown) => {
        if (err instanceof ApiRequestError && err.status === 401) router.replace('/login');
        else setError('Could not load your settings.');
      });
  }, [reset, router]);

  async function onSave(values: UpdateProfileRequest) {
    setMessage(null);
    setError(null);
    try {
      setProfile(await api<PublicProfile>('PATCH', '/me/profile', values));
      setMessage('Profile saved.');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not save your profile.');
    }
  }

  async function togglePrivate(next: boolean) {
    setMessage(null);
    setError(null);
    try {
      setProfile(await api<PublicProfile>('PATCH', '/me/privacy', { isPrivate: next }));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not change privacy.');
    }
  }

  return (
    <AuthShell title="Settings">
      {!profile && !error ? <p className="text-text-muted">Loading...</p> : null}
      {profile ? (
        <div className="space-y-6">
          <form onSubmit={handleSubmit(onSave)} className="space-y-4" noValidate>
            <Field
              label="Display name"
              error={errors.displayName?.message}
              {...register('displayName')}
            />
            <div className="space-y-1">
              <label htmlFor="bio" className="block text-sm font-medium">
                Bio (up to 160 characters)
              </label>
              <textarea
                id="bio"
                rows={3}
                className="w-full rounded-md border border-border bg-card px-3 py-2"
                {...register('bio')}
              />
              {errors.bio ? <p className="text-sm text-danger">{errors.bio.message}</p> : null}
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save profile'}
            </Button>
          </form>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={profile.isPrivate}
              onChange={(e) => togglePrivate(e.target.checked)}
              className="mt-1"
            />
            <span>
              <span className="font-medium">Private account</span>
              <span className="block text-sm text-text-muted">
                New followers need your approval. Only approved followers can see who follows you.
              </span>
            </span>
          </label>

          {message ? (
            <p role="status" className="text-sm text-success">
              {message}
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}

          <p className="text-sm">
            <Link href={`/u/${profile.handle}`} className="text-accent-strong underline">
              View your profile
            </Link>
            {' \u00b7 '}
            <Link href="/account" className="text-accent-strong underline">
              Account
            </Link>
          </p>
        </div>
      ) : null}
      {error && !profile ? (
        <p role="alert" className="text-danger">
          {error}
        </p>
      ) : null}
    </AuthShell>
  );
}

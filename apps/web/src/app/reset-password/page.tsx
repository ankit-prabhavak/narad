'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { ApiRequestError, api, clearCsrf } from '@/lib/api';

const FormSchema = z
  .object({
    newPassword: z.string().min(10, 'Use at least 10 characters.').max(128),
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, {
    message: 'Passwords do not match.',
    path: ['confirm'],
  });
type FormValues = z.infer<typeof FormSchema>;

function ResetForm() {
  const token = useSearchParams().get('token');
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(FormSchema) });

  async function onSubmit(values: FormValues) {
    if (!token) return;
    setFormError(null);
    try {
      await api(
        'POST',
        '/auth/reset-password',
        { token, newPassword: values.newPassword },
        { csrf: false },
      );
      clearCsrf();
      setDone(true);
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : 'Could not reset your password.');
    }
  }

  if (!token) {
    return (
      <p role="alert" className="text-danger">
        This link is incomplete. Please use the link from your email.
      </p>
    );
  }
  if (done) {
    return (
      <div className="space-y-4">
        <p role="status">Your password has been changed. You have been signed out everywhere.</p>
        <Link href="/login" className="text-accent-strong underline">
          Sign in with your new password
        </Link>
      </div>
    );
  }
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Field
        label="New password (at least 10 characters)"
        type="password"
        autoComplete="new-password"
        error={errors.newPassword?.message}
        {...register('newPassword')}
      />
      <Field
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        error={errors.confirm?.message}
        {...register('confirm')}
      />
      {formError ? (
        <p role="alert" className="text-sm text-danger">
          {formError}{' '}
          <Link href="/forgot-password" className="underline">
            Request a new link
          </Link>
        </p>
      ) : null}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Saving...' : 'Set new password'}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Choose a new password">
      <Suspense fallback={<p className="text-text-muted">Loading...</p>}>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}

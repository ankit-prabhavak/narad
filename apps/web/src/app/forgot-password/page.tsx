'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ForgotPasswordRequest } from '@narad/contracts';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { ApiRequestError, api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordRequest>({ resolver: zodResolver(ForgotPasswordRequest) });

  async function onSubmit(values: ForgotPasswordRequest) {
    setFormError(null);
    try {
      await api('POST', '/auth/forgot-password', values, { csrf: false });
      setSent(true);
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : 'Could not send the request.');
    }
  }

  return (
    <AuthShell title="Forgot your password?">
      {sent ? (
        <p role="status">
          If that email has an account, a reset link is on its way. The link works for one hour.
        </p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Field
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          {formError ? (
            <p role="alert" className="text-sm text-danger">
              {formError}
            </p>
          ) : null}
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Sending...' : 'Send reset link'}
          </Button>
        </form>
      )}
      <p className="mt-4 text-sm text-text-muted">
        <Link href="/login" className="text-accent-strong underline">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { RegisterRequest } from '@narad/contracts';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { ApiRequestError, api, clearCsrf } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterRequest>({ resolver: zodResolver(RegisterRequest) });

  async function onSubmit(values: RegisterRequest) {
    setFormError(null);
    try {
      await api('POST', '/auth/register', values, { csrf: false });
      await api(
        'POST',
        '/auth/login',
        { email: values.email, password: values.password },
        { csrf: false },
      );
      clearCsrf();
      router.push('/account');
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : 'Could not create the account.');
    }
  }

  return (
    <AuthShell title="Join NARAD">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field
          label="Display name"
          autoComplete="name"
          error={errors.displayName?.message}
          {...register('displayName')}
        />
        <Field
          label="Handle"
          autoComplete="username"
          error={errors.handle?.message}
          {...register('handle')}
        />
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Field
          label="Password (at least 10 characters)"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        {formError ? (
          <p role="alert" className="text-sm text-danger">
            {formError}
          </p>
        ) : null}
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Creating account...' : 'Create account'}
        </Button>
      </form>
      <p className="mt-4 text-sm text-text-muted">
        Already have an account?{' '}
        <Link href="/login" className="text-accent-strong underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}

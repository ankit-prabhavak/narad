"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoginRequest } from "@narad/contracts";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/button";
import { Field } from "@/components/field";
import { ApiRequestError, api, clearCsrf } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginRequest>({ resolver: zodResolver(LoginRequest) });

  async function onSubmit(values: LoginRequest) {
    setFormError(null);
    try {
      await api("POST", "/auth/login", values, { csrf: false });
      clearCsrf();
      router.push("/account");
    } catch (err) {
      setFormError(
        err instanceof ApiRequestError ? err.message : "Could not sign in.",
      );
    }
  }

  return (
    <AuthShell title="Sign in">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <p className="text-sm">
          <Link
            href="/forgot-password"
            className="text-accent-strong underline"
          >
            Forgot your password?
          </Link>
        </p>
        {formError ? (
          <p role="alert" className="text-sm text-danger">
            {formError}
          </p>
        ) : null}
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>
      <p className="mt-4 text-sm text-text-muted">
        New here?{" "}
        <Link href="/register" className="text-accent-strong underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}

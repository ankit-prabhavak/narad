import Link from 'next/link';
import type { ReactNode } from 'react';

export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <Link href="/" className="mb-6 text-xl font-semibold tracking-wide">
        NARAD
      </Link>
      <div className="rounded-md border border-border bg-card p-6">
        <h1 className="mb-4 text-2xl font-semibold">{title}</h1>
        {children}
      </div>
    </main>
  );
}

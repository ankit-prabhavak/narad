import type { ReactNode } from 'react';

export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-sm px-5 py-16">
      <h1 className="mb-8 text-3xl">{title}</h1>
      <div className="rounded-lg border border-border bg-card p-5">{children}</div>
    </div>
  );
}

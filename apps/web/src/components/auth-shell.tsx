import type { ReactNode } from 'react';

export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-md border border-border bg-card p-6">
        <h1 className="mb-4 text-2xl font-semibold">{title}</h1>
        {children}
      </div>
    </div>
  );
}

import type { ReactNode } from 'react';

export function LegalPage({
  title,
  draft = false,
  children,
}: {
  title: string;
  draft?: boolean;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-2xl space-y-4 px-4 py-12">
      <h1 className="text-3xl font-semibold">{title}</h1>
      {draft ? (
        <p className="rounded-md border border-border bg-bg-secondary p-3 text-sm">
          Draft for legal review. This text is not yet in effect and is not legal advice.
        </p>
      ) : null}
      <div className="space-y-3 leading-relaxed">{children}</div>
    </article>
  );
}

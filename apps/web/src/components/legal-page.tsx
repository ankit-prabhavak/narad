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
    <article className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="text-4xl">{title}</h1>
      {draft ? (
        <p className="mt-4 text-sm text-text-muted">
          Draft for legal review. Not yet in effect, and not legal advice.
        </p>
      ) : null}
      <div className="mt-8 space-y-4 text-lg leading-relaxed">{children}</div>
    </article>
  );
}

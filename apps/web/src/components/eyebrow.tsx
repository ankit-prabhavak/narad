import type { ReactNode } from 'react';

/** Small monospace label, used for section numbers and tags. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-xs font-medium uppercase tracking-widest text-accent">
      {children}
    </p>
  );
}

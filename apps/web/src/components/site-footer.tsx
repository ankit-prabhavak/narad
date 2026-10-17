import Link from 'next/link';
import { Logo } from './logo';

const links = [
  { href: '/about', label: 'About' },
  { href: '/guidelines', label: 'Community guidelines' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/grievance', label: 'Grievance' },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-bg-secondary">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Logo />
          <p className="text-sm text-text-muted">India&apos;s conversations, connected.</p>
          <p className="text-xs text-text-muted">
            NARAD is an independent project and is not affiliated with any government body.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-text-muted hover:text-text hover:underline"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

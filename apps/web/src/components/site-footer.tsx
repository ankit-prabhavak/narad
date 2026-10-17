import Link from 'next/link';

const links = [
  { href: '/about', label: 'About' },
  { href: '/guidelines', label: 'Guidelines' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/grievance', label: 'Grievance' },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 px-5 py-8 text-sm text-text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>An independent project. Not affiliated with any government body.</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-4 gap-y-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="transition-colors hover:text-text">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

export function LogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" className="fill-accent-strong" />
      <path
        d="M9 22 C14 22 18 10 23 10"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="1 3.2"
      />
      <circle cx="9" cy="22" r="3" fill="white" />
      <circle cx="23" cy="10" r="3" fill="white" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark />
      <span className="text-lg font-semibold tracking-[0.12em]">NARAD</span>
    </span>
  );
}

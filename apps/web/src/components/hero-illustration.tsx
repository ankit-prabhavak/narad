export function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 480 360"
      className="h-auto w-full rounded-md border border-border bg-bg-secondary"
      aria-hidden="true"
    >
      <g fill="none" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 8">
        <path d="M110 250 C170 250 190 130 250 130" className="stroke-accent" />
        <path d="M250 130 C320 130 330 240 380 240" className="stroke-accent" />
        <path d="M110 250 C190 320 300 320 380 240" className="stroke-text-muted" />
        <path d="M250 130 C230 70 160 60 120 80" className="stroke-text-muted" />
      </g>

      <circle cx="110" cy="250" r="26" className="fill-card stroke-border" strokeWidth="2" />
      <circle cx="110" cy="244" r="8" className="fill-text-muted" />
      <path d="M96 266 C98 255 122 255 124 266" className="fill-text-muted" />

      <circle cx="250" cy="130" r="26" className="fill-accent-strong" />
      <circle cx="250" cy="124" r="8" fill="white" />
      <path d="M236 146 C238 135 262 135 264 146" fill="white" />

      <circle cx="380" cy="240" r="26" className="fill-card stroke-border" strokeWidth="2" />
      <circle cx="380" cy="234" r="8" className="fill-text-muted" />
      <path d="M366 256 C368 245 392 245 394 256" className="fill-text-muted" />

      <circle cx="120" cy="80" r="20" className="fill-card stroke-border" strokeWidth="2" />
      <circle cx="120" cy="76" r="6" className="fill-text-muted" />

      <g>
        <rect x="150" y="168" width="92" height="34" rx="10" className="fill-card stroke-border" />
        <text x="196" y="190" textAnchor="middle" fontSize="15" className="fill-text">
          नमस्ते
        </text>
      </g>
      <g>
        <rect x="300" y="170" width="76" height="34" rx="10" className="fill-accent-strong" />
        <text x="338" y="192" textAnchor="middle" fontSize="15" fill="white">
          Hello
        </text>
      </g>
    </svg>
  );
}

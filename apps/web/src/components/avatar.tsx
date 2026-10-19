import Image from 'next/image';

export function Avatar({
  url,
  name,
  size = 40,
  className = '',
}: {
  url: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  const initial = Array.from(name.trim())[0] ?? '?';
  const box = { width: size, height: size };
  if (url) {
    return (
      <Image
        src={url}
        alt=""
        width={size}
        height={size}
        unoptimized
        style={box}
        className={'shrink-0 rounded-full object-cover ' + className}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={{ ...box, fontSize: Math.round(size * 0.42) }}
      className={
        'inline-flex shrink-0 items-center justify-center rounded-full bg-bg-secondary font-semibold text-text-muted ' +
        className
      }
    >
      {initial}
    </span>
  );
}

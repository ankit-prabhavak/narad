import type { ComponentProps } from 'react';

type ButtonProps = ComponentProps<'button'> & { variant?: 'primary' | 'secondary' };

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  const style =
    variant === 'primary'
      ? 'bg-accent-strong text-white hover:opacity-90'
      : 'border border-border bg-card hover:bg-bg-secondary';
  return (
    <button
      className={`rounded-md px-4 py-2 font-medium transition-opacity disabled:opacity-60 ${style} ${className}`}
      {...props}
    />
  );
}

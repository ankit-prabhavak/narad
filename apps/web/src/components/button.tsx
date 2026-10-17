import type { ComponentProps } from 'react';

type ButtonProps = ComponentProps<'button'> & { variant?: 'primary' | 'secondary' };

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  const style =
    variant === 'primary'
      ? 'bg-btn text-btn-text hover:opacity-85'
      : 'border border-border hover:bg-bg-secondary';
  return (
    <button
      className={
        'rounded-md px-4 py-2 text-sm font-medium transition disabled:opacity-60 ' +
        style +
        ' ' +
        className
      }
      {...props}
    />
  );
}

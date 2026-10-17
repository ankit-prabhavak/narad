import type { ComponentProps } from 'react';

type FieldProps = ComponentProps<'input'> & { label: string; error?: string };

export function Field({ label, error, id, name, ...props }: FieldProps) {
  const fieldId = id ?? name;
  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={fieldId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? fieldId + '-error' : undefined}
        className="w-full rounded-md border border-border bg-card px-3.5 py-2.5 transition-colors focus:border-text"
        {...props}
      />
      {error ? (
        <p id={fieldId + '-error'} className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

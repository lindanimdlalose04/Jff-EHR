interface FormFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  /** Marks the field with a red asterisk and an accessible note. */
  required?: boolean;
  /** Shown under the control, for guidance that is not an error. */
  hint?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * One labelled control. The label is a real label element, sits above the
 * control, and carries the same weight and colour as the record screens'
 * field labels so a form and a record read as the same system.
 */
export function FormField({
  label,
  htmlFor,
  error,
  required,
  hint,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-semibold text-secondary">
        {label}
        {required && (
          <span className="ml-0.5 text-danger-text" aria-hidden>
            *
          </span>
        )}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && (
        <p className="mt-1 text-xs font-semibold text-danger-text" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

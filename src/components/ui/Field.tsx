"use client";

import { useId } from "react";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

const CONTROL =
  "w-full rounded-xl border-0 bg-surface-muted px-3 py-2.5 text-base md:text-sm text-ink " +
  "transition-[box-shadow,background-color] duration-200 ease-[var(--ease-emphasized)] " +
  "placeholder:text-ink-subtle hover:bg-surface-raised " +
  "focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand/30 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
  required,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-1 text-xs font-medium text-ink-muted"
      >
        {label}
        {required ? (
          <span className="text-negative" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-negative">{error}</p>
      ) : hint ? (
        <p className="text-xs text-ink-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextInput({
  className,
  ...rest
}: ComponentProps<"input">) {
  return <input className={cn(CONTROL, className)} {...rest} />;
}

export function TextArea({
  className,
  rows = 4,
  ...rest
}: ComponentProps<"textarea">) {
  return (
    <textarea
      rows={rows}
      className={cn(CONTROL, "resize-y leading-relaxed", className)}
      {...rest}
    />
  );
}

export function Select({
  className,
  children,
  ...rest
}: ComponentProps<"select">) {
  return (
    <select className={cn(CONTROL, "cursor-pointer pr-8", className)} {...rest}>
      {children}
    </select>
  );
}

/** Label + control in one call, for the many simple rows in the forms. */
export function LabeledInput({
  label,
  hint,
  error,
  required,
  className,
  ...rest
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
} & ComponentProps<"input">) {
  const id = useId();
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      htmlFor={id}
      required={required}
      className={className}
    >
      <TextInput id={id} required={required} {...rest} />
    </Field>
  );
}

export function LabeledTextArea({
  label,
  hint,
  className,
  ...rest
}: {
  label: ReactNode;
  hint?: ReactNode;
  className?: string;
} & ComponentProps<"textarea">) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id} className={className}>
      <TextArea id={id} {...rest} />
    </Field>
  );
}

export function LabeledSelect({
  label,
  hint,
  className,
  children,
  ...rest
}: {
  label: ReactNode;
  hint?: ReactNode;
  className?: string;
} & ComponentProps<"select">) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id} className={className}>
      <Select id={id} {...rest}>
        {children}
      </Select>
    </Field>
  );
}

/** Borderless input used inside the resume editor rows. */
export function InlineInput({ className, ...rest }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "w-full rounded-xl border-0 bg-transparent px-2 py-1.5 text-base md:text-sm text-ink transition",
        "placeholder:text-ink-subtle hover:bg-surface-muted",
        "focus:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-brand/30",
        className,
      )}
      {...rest}
    />
  );
}

export function InlineTextArea({
  className,
  rows = 2,
  ...rest
}: ComponentProps<"textarea">) {
  return (
    <textarea
      rows={rows}
      className={cn(
        "w-full resize-y rounded-xl border-0 bg-transparent px-2 py-1.5 text-base md:text-sm leading-relaxed text-ink transition",
        "placeholder:text-ink-subtle hover:bg-surface-muted",
        "focus:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-brand/30",
        className,
      )}
      {...rest}
    />
  );
}

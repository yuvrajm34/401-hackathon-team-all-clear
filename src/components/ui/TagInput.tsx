"use client";

import { X } from "lucide-react";
import { useId, useState } from "react";
import type { KeyboardEvent } from "react";

import { cn } from "@/lib/cn";

/**
 * Chip editor for tags and skill lists. Commits on Enter or comma, removes the
 * last chip on Backspace when the field is empty.
 */
export function TagInput({
  values,
  onChange,
  label,
  placeholder = "Add and press Enter",
  className,
  suggestions = [],
}: {
  values: string[];
  onChange: (values: string[]) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState("");
  const id = useId();

  const commit = (raw: string) => {
    const next = raw.trim().replace(/,$/, "");
    if (!next) return;
    if (values.some((value) => value.toLowerCase() === next.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...values, next]);
    setDraft("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit(draft);
    } else if (event.key === "Backspace" && !draft && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  const remaining = suggestions.filter(
    (suggestion) =>
      !values.some((value) => value.toLowerCase() === suggestion.toLowerCase()),
  );

  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <label htmlFor={id} className="block text-xs font-medium text-ink-muted">
          {label}
        </label>
      ) : null}

      <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-surface-muted px-2 py-1.5 transition focus-within:bg-surface focus-within:ring-2 focus-within:ring-brand/30">
        {values.map((value) => (
          <span
            key={value}
            className="chip-tone inline-flex items-center gap-1 rounded-lg bg-accent-soft px-2 py-0.5 text-xs text-accent-on-soft"
          >
            {value}
            <button
              type="button"
              onClick={() => onChange(values.filter((v) => v !== value))}
              aria-label={`Remove ${value}`}
              className="rounded-sm text-accent-on-soft/70 transition hover:text-accent-on-soft"
            >
              <X size={12} aria-hidden="true" />
            </button>
          </span>
        ))}

        <input
          id={id}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => commit(draft)}
          placeholder={values.length === 0 ? placeholder : ""}
          className="min-w-[8ch] flex-1 bg-transparent px-1 py-0.5 text-sm text-ink outline-none placeholder:text-ink-subtle"
        />
      </div>

      {remaining.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {remaining.slice(0, 8).map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => commit(suggestion)}
              className="rounded-lg bg-surface-muted px-1.5 py-0.5 text-[11px] text-ink-muted transition hover:bg-brand-soft hover:text-brand-on-soft"
            >
              + {suggestion}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

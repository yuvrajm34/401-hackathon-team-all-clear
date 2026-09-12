"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { Stage } from "@/lib/types";

import { ApplicationForm } from "./ApplicationForm";

/**
 * Opens the application form. Rendered in the shell header and reused on the
 * tracker page and empty states.
 */
export function QuickAddButton({
  label = "Add application",
  defaultStage = "applied",
  variant = "primary",
  size = "md",
  iconOnly = false,
  className,
}: {
  label?: string;
  defaultStage?: Stage;
  variant?: "primary" | "secondary" | "soft" | "ghost";
  size?: "sm" | "md" | "lg" | "icon";
  iconOnly?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={iconOnly ? "icon" : size}
        onClick={() => setOpen(true)}
        aria-label={iconOnly ? label : undefined}
        className={cn(className)}
      >
        <Plus size={16} aria-hidden="true" />
        {iconOnly ? null : <span>{label}</span>}
      </Button>

      <ApplicationForm
        open={open}
        onClose={() => setOpen(false)}
        defaultStage={defaultStage}
      />
    </>
  );
}

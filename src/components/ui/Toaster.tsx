"use client";

import { CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { createPortal } from "react-dom";
import { create } from "zustand";

import { cn } from "@/lib/cn";
import { createId } from "@/lib/ids";
import { useIsMounted } from "@/lib/useIsMounted";

type ToastTone = "success" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ToastStore {
  toasts: Toast[];
  push: (message: string, tone?: ToastTone) => void;
  dismiss: (id: string) => void;
}

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (message, tone = "success") => {
    const id = createId("toast");
    set((state) => ({ toasts: [...state.toasts, { id, message, tone }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 3200);
  },
  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

/** Fire-and-forget confirmations: `toast("Copied to clipboard")`. */
export function toast(message: string, tone: ToastTone = "success") {
  useToastStore.getState().push(message, tone);
}

const ICONS = {
  success: CheckCircle2,
  info: Info,
  warning: TriangleAlert,
} as const;

const TONES: Record<ToastTone, string> = {
  success: "text-positive",
  info: "text-ink",
  warning: "text-negative",
};

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);
  const mounted = useIsMounted();

  if (!mounted) return null;

  return createPortal(
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex flex-col items-center gap-2 px-4 sm:bottom-6 print:hidden"
    >
      {toasts.map((item) => {
        const Icon = ICONS[item.tone];
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => dismiss(item.id)}
            className="animate-pop pointer-events-auto flex max-w-sm items-center gap-2 rounded-2xl bg-surface-raised px-3.5 py-2.5 text-sm text-ink shadow-raised"
          >
            <Icon size={16} className={cn("shrink-0", TONES[item.tone])} aria-hidden="true" />
            <span className="text-left">{item.message}</span>
          </button>
        );
      })}
    </div>,
    document.body,
  );
}

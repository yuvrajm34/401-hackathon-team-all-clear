"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, LoaderCircle, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";

import { AtmosphereWell } from "@/components/layout/AtmosphereWell";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import { toast, Toaster } from "@/components/ui/Toaster";
import { nameFromEmail, writeSession } from "@/lib/demo-session";
import { useDemoSession } from "@/lib/useDemoSession";
import { useAppStore } from "@/store/useAppStore";

const WORDMARK = "ApplyPath";
const ACCENT_COLORS = [
  "#f97316",
  "#22c55e",
  "#3b82f6",
  "#eab308",
  "#ec4899",
  "#8b5cf6",
];

const DEMO_EMAIL = "alex@applypath.dev";
const DEMO_PASSWORD = "demo";

export function LoginView() {
  const router = useRouter();
  const session = useDemoSession();
  const reduceMotion = useReducedMotion();
  const updateSettings = useAppStore((state) => state.updateSettings);

  const emailId = useId();
  const passwordId = useId();

  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Opening your workspace…");

  useEffect(() => {
    if (session) router.replace("/");
  }, [session, router]);

  const enter = async (nextEmail: string) => {
    if (busy) return;
    setBusy(true);
    const resolved = nextEmail.trim() || DEMO_EMAIL;
    const savedName = useAppStore.getState().settings.ownerName.trim();
    const name = savedName || nameFromEmail(resolved);
    setStatus("Checking this browser…");
    await pause(reduceMotion ? 120 : 420);
    setStatus("Opening your workspace…");
    await pause(reduceMotion ? 80 : 380);
    writeSession({ email: resolved, name });
    if (!savedName) updateSettings({ ownerName: name });
    router.push("/");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void enter(email);
  };

  if (session) {
    return (
      <div className="relative h-dvh overflow-hidden">
        <AtmosphereWell />
      </div>
    );
  }

  return (
    <div className="relative isolate flex h-dvh flex-col overflow-hidden">
      <AtmosphereWell />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <span className="absolute -left-16 top-24 size-56 rounded-full bg-[#f97316]/20 blur-3xl" />
        <span className="absolute -right-10 top-40 size-64 rounded-full bg-[#8b5cf6]/25 blur-3xl" />
        <span className="absolute bottom-10 left-1/3 size-48 rounded-full bg-[#3b82f6]/15 blur-3xl" />
      </div>

      <div className="pointer-events-auto absolute right-3 top-3 z-20 sm:right-6">
        <ThemeToggle />
      </div>

      <main className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-4 py-10">
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.2, 0, 0, 1] }}
          className="w-full max-w-[420px]"
        >
          <div className="overflow-hidden rounded-[1.75rem] bg-surface shadow-raised">
            <div
              aria-hidden="true"
              className="h-1.5"
              style={{
                background: `linear-gradient(90deg, ${ACCENT_COLORS.join(", ")})`,
              }}
            />

            <div className="px-6 pb-6 pt-7 sm:px-8 sm:pb-8">
              <p className="text-center font-display text-[28px] font-semibold tracking-tight text-ink sm:text-[32px]">
                <span className="inline-flex" aria-label={WORDMARK}>
                  {WORDMARK.split("").map((letter, index) => (
                    <motion.span
                      key={`${letter}-${index}`}
                      aria-hidden="true"
                      className="inline-block"
                      style={{
                        color: ACCENT_COLORS[index % ACCENT_COLORS.length],
                      }}
                      initial={
                        reduceMotion
                          ? { opacity: 0 }
                          : { opacity: 0, y: 10, scale: 0.6 }
                      }
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        duration: reduceMotion ? 0.2 : 0.32,
                        delay: index * 0.045,
                        ease: [0.2, 0, 0, 1],
                      }}
                    >
                      {letter}
                    </motion.span>
                  ))}
                </span>
              </p>

              <div className="mt-3 text-center">
                <h1 className="font-display text-xl font-semibold text-ink">
                  Welcome
                </h1>
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                  Sign in to keep every application, resume, and reply in one
                  place.
                </p>
              </div>

              <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
                <Field label="Email" htmlFor={emailId}>
                  <TextInput
                    id={emailId}
                    type="email"
                    name="email"
                    autoComplete="username"
                    inputMode="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={DEMO_EMAIL}
                  />
                </Field>

                <Field label="Password" htmlFor={passwordId}>
                  <div className="relative">
                    <TextInput
                      id={passwordId}
                      type={showPassword ? "text" : "password"}
                      name="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="••••••••"
                      className="pr-11"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-1.5 my-auto flex size-8 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-muted hover:text-ink"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((open) => !open)}
                    >
                      {showPassword ? (
                        <EyeOff size={16} aria-hidden="true" />
                      ) : (
                        <Eye size={16} aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </Field>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={busy}
                >
                  {busy ? (
                    <>
                      <LoaderCircle
                        size={16}
                        className="animate-spin"
                        aria-hidden="true"
                      />
                      {status}
                    </>
                  ) : (
                    <>
                      Log in
                      <ArrowRight size={16} aria-hidden="true" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-ink-subtle">
                <span className="h-px flex-1 bg-surface-muted" />
                or
                <span className="h-px flex-1 bg-surface-muted" />
              </div>

              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="mt-5 w-full"
                disabled={busy}
                onClick={() => {
                  toast("Sign up isn't available in this demo", "warning");
                }}
              >
                <UserPlus size={16} aria-hidden="true" />
                Sign up
              </Button>
            </div>
          </div>
        </motion.div>
      </main>

      <AnimatePresence>
        {busy ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-x-0 bottom-6 text-center text-xs text-ink-muted"
          >
            {status}
          </motion.p>
        ) : null}
      </AnimatePresence>

      <Toaster />
    </div>
  );
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

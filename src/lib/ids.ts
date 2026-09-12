/**
 * ID generation. `crypto.randomUUID` needs a secure context, so fall back to a
 * random-string composition for older browsers and non-HTTPS previews.
 */
export function createId(prefix = "id"): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  return `${prefix}_${random}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

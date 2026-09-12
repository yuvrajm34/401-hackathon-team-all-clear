/**
 * Posting links are the only stable identity an imported job has, so they are
 * what dedupe compares. Kept loose on purpose — protocol, `www.`, and a
 * trailing slash should not make the same posting look new. Query strings are
 * preserved because some boards put the job id there
 * (`stripe.com/jobs/search?gh_jid=8172510`).
 */
export function normalizeUrl(url: string): string {
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");
}

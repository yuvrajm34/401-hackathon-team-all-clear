/**
 * Companies whose Greenhouse boards ApplyPath searches.
 *
 * `slug` is the board token from the company's public Greenhouse URL. Every
 * entry here was called against the live API and returned postings; a wrong or
 * retired slug 404s, so add new ones only after checking:
 *
 *   curl -s "https://boards-api.greenhouse.io/v1/boards/<slug>/jobs" | head -c 200
 *
 * Known dead: `doordash` and `plaid` both 404 — they have moved off Greenhouse.
 */

export interface JobCompany {
  slug: string;
  name: string;
}

export const COMPANIES: JobCompany[] = [
  { slug: "affirm", name: "Affirm" },
  { slug: "airbnb", name: "Airbnb" },
  { slug: "asana", name: "Asana" },
  { slug: "brex", name: "Brex" },
  { slug: "cloudflare", name: "Cloudflare" },
  { slug: "coinbase", name: "Coinbase" },
  { slug: "databricks", name: "Databricks" },
  { slug: "discord", name: "Discord" },
  { slug: "dropbox", name: "Dropbox" },
  { slug: "figma", name: "Figma" },
  { slug: "gitlab", name: "GitLab" },
  { slug: "instacart", name: "Instacart" },
  { slug: "lyft", name: "Lyft" },
  { slug: "pinterest", name: "Pinterest" },
  { slug: "reddit", name: "Reddit" },
  { slug: "robinhood", name: "Robinhood" },
  { slug: "stripe", name: "Stripe" },
  { slug: "twilio", name: "Twilio" },
];

export const COMPANY_SLUGS = COMPANIES.map((company) => company.slug);

export function findCompany(slug: string): JobCompany | undefined {
  return COMPANIES.find((company) => company.slug === slug);
}

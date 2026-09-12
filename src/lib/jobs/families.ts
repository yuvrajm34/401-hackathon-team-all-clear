/**
 * Coarse job families, inferred from the posting title.
 *
 * Greenhouse departments are each company's internal org chart, so they are
 * useless as a cross-company filter: Stripe alone publishes 195 of them and
 * "Account Executives (EMEA)" does not line up with anything at Figma. These
 * twelve buckets are the same everywhere, which is what someone browsing
 * openings actually wants to narrow by.
 *
 * Like the keyword matcher, this is a heuristic and it runs entirely locally.
 * Order matters: the first family whose pattern hits wins, so the narrow cases
 * ("Product Designer" is design, "Product Marketing" is marketing) are checked
 * before the broad ones.
 */

export const JOB_FAMILIES = [
  "Engineering",
  "Data & ML",
  "Design",
  "Product",
  "Sales",
  "Marketing",
  "Support",
  "Operations",
  "Finance",
  "Legal",
  "People",
  "Other",
] as const;

export type JobFamily = (typeof JOB_FAMILIES)[number];

const RULES: [JobFamily, RegExp][] = [
  [
    "Legal",
    /\b(legal|counsel|paralegal|compliance|privacy|regulatory|litigation)\b/,
  ],
  [
    "Finance",
    /\b(finance|financial|accounting|accountant|tax|treasury|audit|payroll|controller|fp&a|bookkeep)\b/,
  ],
  [
    "People",
    /\b(recruit|recruiter|recruiting|talent|people|human resources|onboarding|compensation|benefits)\b/,
  ],
  [
    "Support",
    /\b(support|customer success|customer experience|customer care|technical account|community)\b/,
  ],
  [
    "Sales",
    /\b(sales|account executive|account manager|business development|partnership|partnerships|solutions architect|solutions engineer|sales engineer|revenue|channel|quota)\b/,
  ],
  [
    "Marketing",
    /\b(marketing|growth|brand|content|communications|public relations|seo|demand gen|lifecycle|events)\b/,
  ],
  [
    "Data & ML",
    /\b(data scien|data engineer|data analyst|analytics|machine learning|research scientist|statistic|quantitative|business intelligence|econometric)/,
  ],
  ["Design", /\b(design|designer|ux|user experience|creative|illustrat|motion)\b/],
  ["Product", /\b(product manag|product owner|product lead|group product)\b/],
  [
    "Engineering",
    /\b(engineer|engineering|developer|software|infrastructure|platform|devops|sre|reliability|security|architect|ios|android|frontend|front end|backend|back end|full stack|fullstack|cryptograph|qa|automation)\b/,
  ],
  [
    "Operations",
    /\b(operations|program manager|project manager|strategy|supply chain|logistics|facilities|workplace|procurement|vendor)\b/,
  ],
];

/**
 * `title` carries the signal; `department` is a fallback for terse titles like
 * "Analyst II" where the org chart is the only clue.
 */
export function classifyFamily(title: string, department: string): JobFamily {
  const haystack = `${title} ${department}`.toLowerCase();

  for (const [family, pattern] of RULES) {
    if (pattern.test(haystack)) return family;
  }

  return "Other";
}

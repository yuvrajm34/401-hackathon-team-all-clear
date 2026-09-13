/**
 * Lightweight keyword matching between a job description and a resume.
 *
 * This is deliberately heuristic and entirely local: no API calls, no model.
 * The goal is to answer "does my tailored resume actually echo the language of
 * this posting?" which is the question an ATS keyword filter is really asking.
 */

const STOPWORDS = new Set([
  "a","able","about","above","across","after","against","all","also","an","and","any","are","as","at",
  "back","be","because","been","before","being","below","best","between","both","build","building","but","by",
  "can","come","comfort","comfortable","could",
  "day","days","different","do","does","doing","done","down","during",
  "each","either","else","end","enough","etc","even","ever","every","experience","experienced",
  "few","find","first","for","from","full","further",
  "get","give","go","going","good","great",
  "had","has","have","having","he","help","helps","her","here","hers","him","his","how","however",
  "i","if","in","includes","including","inside","into","involves","is","it","its",
  "join","just",
  "keep","know","knowledge",
  "least","less","let","like","look","looking","lot",
  "made","make","making","many","may","me","might","modern","more","most","much","must","my",
  "need","needs","never","new","next","no","nor","not","now",
  "of","off","often","on","once","one","only","onto","or","other","others","our","ours","out","over","own",
  "part","per","plus","proud","put",
  "requirements","responsibilities","role","roles",
  "said","same","see","seeking","several","shall","she","ship","shipping","should","since","small","so","some","strong","such","support",
  "take","team","teams","than","that","the","their","them","then","there","these","they","thing","things","this","those","through","time","to","too","track","two",
  "under","until","up","upon","us","use","used","using",
  "very",
  "want","was","way","we","well","were","what","when","where","which","while","who","whom","why","will","with","within","without","work","working","would","write","writing","written",
  "year","years","you","your","yours",
]);

/**
 * Tokens worth surfacing even when they appear only once, and multi-word
 * phrases we want treated as a single keyword.
 */
const PRIORITY_PHRASES = [
  "a/b testing",
  "ci/cd",
  "code review",
  "core web vitals",
  "data structures",
  "design system",
  "design systems",
  "distributed systems",
  "error handling",
  "event driven",
  "github actions",
  "graphql schema",
  "machine learning",
  "message queue",
  "microservices",
  "node.js",
  "object oriented",
  "pull requests",
  "query optimisation",
  "query optimization",
  "rest api",
  "rest apis",
  "ruby on rails",
  "schema design",
  "system design",
  "test driven",
  "unit tests",
  "version control",
  "web vitals",
];

/** Terms that should never be dropped as "too short" or low frequency. */
const TECH_VOCABULARY = new Set([
  "accessibility","agile","algorithms","android","angular","ansible","api","apis","aws","azure",
  "backend","bash","bigquery","c","c#","c++","caching","cassandra","cloud","cloudflare","css","cypress",
  "d3","dart","databases","dbt","debugging","deployment","devops","django","docker","dynamodb",
  "elasticsearch","elixir","ember","etl","express",
  "fastapi","figma","firebase","flask","flutter","frontend","fullstack",
  "gcp","git","go","golang","grafana","graphql","grpc","gts",
  "hadoop","haskell","html","http",
  "ios","infrastructure","integration","java","javascript","jenkins","jest","jira","jquery","json","junit",
  "kafka","kotlin","kubernetes",
  "laravel","latency","linux","lua",
  "mariadb","matlab","microservices","migration","mobile","mongodb","monitoring","mysql",
  "nestjs","networking","nextjs","nginx","nosql","numpy",
  "observability","oop","opentelemetry","optimization","optimisation","oracle",
  "pandas","performance","perl","php","playwright","postgres","postgresql","prisma","profiling","prometheus","pytest","python","pytorch",
  "r","rails","react","redis","redux","refactoring","reliability","rest","ruby","rust",
  "saas","salesforce","scala","scalability","scss","security","selenium","serverless","shell","snowflake","spark","sql","sqlite","sre","storybook","svelte","swift","swiftui",
  "tableau","tailwind","tensorflow","terraform","testing","tests","typescript",
  "ui","unix","ux",
  "vue","vitest",
  "wcag","webpack","websockets",
  "xml","yaml",
]);

/** Bidirectional equivalences so "postgres" on a resume matches "PostgreSQL". */
const ALIASES: Record<string, string[]> = {
  accessibility: ["a11y", "wcag", "aria", "screen reader"],
  a11y: ["accessibility", "wcag"],
  ci: ["continuous integration", "ci/cd", "github actions"],
  "ci/cd": ["ci", "continuous integration", "github actions", "pipeline"],
  golang: ["go"],
  go: ["golang"],
  javascript: ["js", "es6", "ecmascript"],
  js: ["javascript"],
  k8s: ["kubernetes"],
  kubernetes: ["k8s"],
  "node.js": ["node", "nodejs"],
  nodejs: ["node", "node.js"],
  nextjs: ["next.js", "next"],
  optimisation: ["optimization"],
  optimization: ["optimisation"],
  postgres: ["postgresql"],
  postgresql: ["postgres"],
  rails: ["ruby on rails", "ruby"],
  "ruby on rails": ["rails"],
  rest: ["rest api", "rest apis", "restful"],
  "rest api": ["rest", "restful", "api"],
  tailwind: ["tailwind css", "tailwindcss"],
  typescript: ["ts"],
  ts: ["typescript"],
  "unit tests": ["unit testing", "testing", "jest", "vitest", "pytest"],
  "web vitals": ["core web vitals", "lighthouse", "performance"],
};

export interface KeywordHit {
  keyword: string;
  /** How often the keyword appears in the job description. */
  weight: number;
  matched: boolean;
  /** Set when the match came through an alias rather than the literal term. */
  matchedVia?: string;
}

export interface MatchReport {
  /** 0-100. Weighted by how often each keyword shows up in the posting. */
  score: number;
  hits: KeywordHit[];
  matched: KeywordHit[];
  missing: KeywordHit[];
  /** True when there was nothing to compare against. */
  empty: boolean;
}

export function emptyMatchReport(): MatchReport {
  return { score: 0, hits: [], matched: [], missing: [], empty: true };
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[^a-z0-9+#./\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(normalized: string): string[] {
  return normalized
    .split(" ")
    .map((token) => token.replace(/^[-./]+|[-./]+$/g, ""))
    .filter(Boolean);
}

/**
 * Ranks the terms a posting actually emphasises. Frequency drives the weight;
 * known technical vocabulary and curated phrases get a floor so a single
 * mention of "Kubernetes" is not filtered out as noise.
 */
export function extractKeywords(jobDescription: string, limit = 28): KeywordHit[] {
  const normalized = normalize(jobDescription);
  if (!normalized) return [];

  const weights = new Map<string, number>();

  for (const phrase of PRIORITY_PHRASES) {
    const occurrences = countOccurrences(normalized, phrase);
    if (occurrences > 0) weights.set(phrase, occurrences * 3);
  }

  for (const token of tokenize(normalized)) {
    if (STOPWORDS.has(token)) continue;
    if (token.length < 2) continue;
    if (/^\d+$/.test(token)) continue;

    const isTech = TECH_VOCABULARY.has(token);
    if (!isTech && token.length < 4) continue;

    weights.set(token, (weights.get(token) ?? 0) + (isTech ? 2 : 1));
  }

  // Drop single-mention generic words; keep anything technical.
  const ranked = [...weights.entries()]
    .filter(([keyword, weight]) => weight > 1 || TECH_VOCABULARY.has(keyword))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit);

  return ranked.map(([keyword, weight]) => ({ keyword, weight, matched: false }));
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

function containsTerm(normalizedHaystack: string, term: string): boolean {
  if (term.includes(" ") || term.includes("/") || term.includes(".")) {
    return normalizedHaystack.includes(term);
  }
  // Word-boundary match so "go" doesn't match "going".
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(
    normalizedHaystack,
  );
}

export function buildMatchReport(
  jobDescription: string,
  resumeContent: string,
): MatchReport {
  const keywords = extractKeywords(jobDescription);
  if (keywords.length === 0 || !resumeContent.trim()) {
    return { ...emptyMatchReport(), hits: keywords, missing: keywords };
  }

  const haystack = normalize(resumeContent);

  const hits: KeywordHit[] = keywords.map((hit) => {
    if (containsTerm(haystack, hit.keyword)) {
      return { ...hit, matched: true };
    }
    for (const alias of ALIASES[hit.keyword] ?? []) {
      if (containsTerm(haystack, alias)) {
        return { ...hit, matched: true, matchedVia: alias };
      }
    }
    return { ...hit, matched: false };
  });

  const totalWeight = hits.reduce((sum, hit) => sum + hit.weight, 0);
  const matchedWeight = hits
    .filter((hit) => hit.matched)
    .reduce((sum, hit) => sum + hit.weight, 0);

  return {
    score: totalWeight === 0 ? 0 : Math.round((matchedWeight / totalWeight) * 100),
    hits,
    matched: hits.filter((hit) => hit.matched),
    missing: hits.filter((hit) => !hit.matched),
    empty: false,
  };
}

export function scoreLabel(score: number): {
  label: string;
  tone: "strong" | "fair" | "weak";
} {
  if (score >= 70) return { label: "Strong match", tone: "strong" };
  if (score >= 45) return { label: "Partial match", tone: "fair" };
  return { label: "Needs work", tone: "weak" };
}

/**
 * Rough skill categories for placing a missing keyword somewhere sensible
 * instead of always dumping it into a generic bucket. Deliberately a small,
 * fast lookup table (no AI call) — this runs on every "add to resume"
 * click and needs to feel instant.
 */
const SKILL_CATEGORIES: { label: string; matches: string[] }[] = [
  {
    label: "Languages",
    matches: [
      "python", "java", "javascript", "typescript", "c++", "c#", "golang",
      "go", "rust", "ruby", "php", "swift", "kotlin", "sql", "html", "css",
      "scala", "r", "matlab", "bash", "shell", "perl", "dart", "objective-c",
    ],
  },
  {
    label: "Frameworks",
    matches: [
      "react", "next.js", "nextjs", "vue", "angular", "django", "flask",
      "express", "spring", "spring boot", "rails", "laravel", ".net",
      "fastapi", "node.js", "nodejs", "svelte", "nestjs", "gin",
    ],
  },
  {
    label: "Cloud & DevOps",
    matches: [
      "aws", "azure", "gcp", "google cloud", "ci/cd", "cicd",
      "github actions", "devops", "terraform", "ansible", "jenkins",
      "kubernetes", "docker",
    ],
  },
  {
    label: "Databases",
    matches: [
      "postgresql", "postgres", "mysql", "mongodb", "redis", "sqlite",
      "dynamodb", "cassandra", "oracle", "elasticsearch", "firebase",
    ],
  },
  {
    label: "Tools",
    matches: [
      "git", "jira", "figma", "postman", "webpack", "vite", "confluence",
      "slack", "linux",
    ],
  },
];

/** Best-guess category label for a keyword, or "Additional skills" if none match. */
export function classifySkillCategory(keyword: string): string {
  const lower = keyword.trim().toLowerCase();
  for (const category of SKILL_CATEGORIES) {
    if (category.matches.some((term) => lower === term || lower.includes(term))) {
      return category.label;
    }
  }
  return "Additional skills";
}

/**
 * Whether an existing skill group's own label plausibly represents the
 * given category — tolerant of real-world variants like "Programming
 * Languages" or "Scripting & Languages" both counting as "Languages", so a
 * keyword lands in the resume's own existing grouping instead of a second,
 * redundant one.
 */
export function skillGroupMatchesCategory(label: string, category: string): boolean {
  const a = label.trim().toLowerCase();
  const b = category.trim().toLowerCase();
  if (!a || !b) return false;
  if (a === b) return true;
  const bSingular = b.replace(/s$/, "");
  return a.includes(bSingular) || b.includes(a);
}

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
 * High-frequency posting jargon that is not something you would add to a
 * skills line. Without this, "business / strategy / people" drown out
 * React, TypeScript, and the actual stack.
 */
const FLUFF = new Set([
  "ability","able","across","action","actions","acquired","acquisition","agency","agile",
  "alignment","analytics","application","applications","apply","approach","area","areas",
  "based","benefit","benefits","bonus","business","candidate","candidates","capacity",
  "career","change","client","clients","close","collaborate","collaborating","collaboration",
  "collaborative","communication","company","compensation","complex","compliance",
  "computer","concept","concepts","continuous","contribute","contributing","contribution",
  "core","create","creating","cross","culture","current","customer","customers",
  "data","decision","decisions","degree","deliver","delivering","delivery","department",
  "description","design","designer","designing","develop","developer","developers",
  "developing","development","digital","diverse","diversity","drive","driven","driving",
  "effective","effectively","employee","employees","employer","employment","enable",
  "end","engineer","engineering","engineers","ensure","environment","equal","equity",
  "excellent","execution","executive","expected","fast","field","focus","focused",
  "function","functional","functions","future","global","goal","goals","growth",
  "hand","hands","high","highly","hire","hiring","hours","human","identify","impact",
  "improve","improvement","inclusive","inclusion","industry","information","innovation",
  "innovative","integration","integrations","interested","internal","job","jobs",
  "key","large","lead","leader","leaders","leadership","leading","learn","learning",
  "level","life","location","locations","maintain","manage","management","manager",
  "managing","market","marketing","member","members","mission","multiple","office",
  "operate","operating","operation","operations","opportunity","opportunities",
  "organization","organizational","orientated","oriented","outcome","outcomes",
  "owner","ownership","pace","partner","partners","partnership","passion","passionate",
  "people","perform","performance","person","pipeline","plan","planning","platform",
  "platforms","please","position","positions","potential","practice","practices",
  "preferred","process","processes","product","production","products","professional",
  "program","programs","project","projects","provide","quality","range","related",
  "relationship","relationships","report","reporting","required","requirement",
  "responsible","result","results","resume","reward","rewards","salary","scale",
  "science","self","service","services","set","skill","skills","software","solution",
  "solutions","stakeholder","stakeholders","standard","standards","status","strategic",
  "strategy","success","successful","system","systems","technical","technology",
  "tools","total","understand","understanding","user","users","value","values",
  "vision","world",
  "infrastructure","integration",
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
  "a11y","accessibility","algorithms","android","angular","ansible","api","apis","aws","azure",
  "backend","bash","bigquery","c","c#","c++","caching","cassandra","ci","cicd","cloudflare","css","cypress",
  "d3","dart","dbt","devops","django","docker","dynamodb",
  "elasticsearch","elixir","ember","etl","express",
  "fastapi","figma","firebase","flask","flutter","frontend","fullstack",
  "gcp","git","github","gitlab","go","golang","grafana","graphql","grpc",
  "hadoop","haskell","html","http",
  "ios","java","javascript","jenkins","jest","jira","jquery","json","junit",
  "k8s","kafka","kotlin","kubernetes",
  "laravel","linux","lua",
  "mariadb","matlab","microservices","mongodb","mysql",
  "nestjs","nextjs","nginx","nodejs","nosql","numpy",
  "observability","ollama","oop","opentelemetry","oracle",
  "pandas","perl","php","playwright","postgres","postgresql","prisma","prometheus","pytest","python","pytorch",
  "rails","react","redis","redux","rest","ruby","rust",
  "salesforce","scala","scss","selenium","serverless","snowflake","spark","sql","sqlite","sre","storybook","svelte","swift","swiftui",
  "tableau","tailwind","tensorflow","terraform","typescript",
  "unix",
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

/** Stack tokens ATS filters actually care about: languages, tools, APIs. */
function looksLikeTool(token: string): boolean {
  if (token.length < 2) return false;
  if (FLUFF.has(token) || STOPWORDS.has(token)) return false;
  if (/[#++.]/.test(token)) return true;
  if (/\d/.test(token) && /[a-z]/.test(token)) return true;
  if (token.endsWith("js") || token.endsWith("sql") || token.endsWith("db")) {
    return token.length >= 3;
  }
  return false;
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
    if (FLUFF.has(token)) continue;
    if (STOPWORDS.has(token) && !TECH_VOCABULARY.has(token)) continue;
    if (token.length < 2) continue;
    if (/^\d+$/.test(token)) continue;

    const isTech = TECH_VOCABULARY.has(token);
    if (!isTech && !looksLikeTool(token)) continue;

    weights.set(token, (weights.get(token) ?? 0) + (isTech ? 2 : 1));
  }

  const ranked = [...weights.entries()]
    .filter(
      ([keyword, weight]) =>
        TECH_VOCABULARY.has(keyword) ||
        PRIORITY_PHRASES.includes(keyword) ||
        looksLikeTool(keyword) ||
        weight >= 3,
    )
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

export interface ScoreLift {
  /** Highest-weight missing terms, in the order they should be added. */
  terms: KeywordHit[];
  /** Score after those terms are treated as matched. */
  projectedScore: number;
  /** True when covering this set reaches `target`. */
  reachesTarget: boolean;
}

/**
 * Greedy lift: cover the heaviest missing terms until the weighted score
 * would hit `target` (the "Strong match" band). Read-only — it names gaps,
 * it does not edit the resume.
 */
export function termsToReachScore(
  report: MatchReport,
  target = 70,
): ScoreLift | null {
  if (report.empty || report.hits.length === 0) return null;
  if (report.score >= target) return null;

  const totalWeight = report.hits.reduce((sum, hit) => sum + hit.weight, 0);
  if (totalWeight === 0) return null;

  let matchedWeight = report.matched.reduce((sum, hit) => sum + hit.weight, 0);
  const missing = [...report.missing].sort(
    (a, b) => b.weight - a.weight || a.keyword.localeCompare(b.keyword),
  );

  const terms: KeywordHit[] = [];
  for (const hit of missing) {
    terms.push(hit);
    matchedWeight += hit.weight;
    const projectedScore = Math.round((matchedWeight / totalWeight) * 100);
    if (projectedScore >= target) {
      return { terms, projectedScore, reachesTarget: true };
    }
  }

  if (terms.length === 0) return null;

  return {
    terms,
    projectedScore: Math.round((matchedWeight / totalWeight) * 100),
    reachesTarget: false,
  };
}

export function scoreLabel(score: number): {
  label: string;
  tone: "strong" | "fair" | "weak";
} {
  if (score >= 70) return { label: "Strong match", tone: "strong" };
  if (score <= 35) return { label: "Needs work", tone: "weak" };
  return { label: "Partial match", tone: "fair" };
}

/** Signal color for a match score. Mid band stays grey. */
export function matchSignal(
  score: number,
): "positive" | "negative" | "neutral" {
  if (score >= 70) return "positive";
  if (score <= 35) return "negative";
  return "neutral";
}

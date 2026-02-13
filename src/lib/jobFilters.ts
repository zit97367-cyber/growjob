export type FeedJob = {
  title: string;
  company: string;
  location?: string;
  isRemote: boolean;
  matchReason: string;
  description?: string;
};

export type MainCategory =
  | "AI"
  | "BACKEND"
  | "FRONT_END"
  | "CRYPTO"
  | "NON_TECH"
  | "DESIGN"
  | "MARKETING"
  | "DATA_SCIENCE"
  | "OTHER";

export const MAIN_CATEGORIES: Array<{ value: MainCategory; label: string }> = [
  { value: "AI", label: "AI" },
  { value: "BACKEND", label: "Backend" },
  { value: "FRONT_END", label: "Front End" },
  { value: "CRYPTO", label: "Crypto" },
  { value: "NON_TECH", label: "Non Tech" },
  { value: "DESIGN", label: "Design" },
  { value: "MARKETING", label: "Marketing" },
  { value: "DATA_SCIENCE", label: "Data Science" },
];

const CATEGORY_KEYWORDS: Record<MainCategory, string[]> = {
  AI: ["ai", "machine learning", "ml", "llm", "nlp", "prompt", "inference", "genai"],
  BACKEND: ["backend", "platform", "api", "distributed", "golang", "java", "node", "python", "rust"],
  FRONT_END: ["front end", "frontend", "react", "next.js", "web", "ui engineer"],
  CRYPTO: ["crypto", "web3", "blockchain", "solidity", "smart contract", "defi", "evm", "protocol"],
  NON_TECH: [
    "operations",
    "support",
    "community",
    "customer success",
    "project manager",
    "product manager",
    "people",
    "hr",
    "recruiter",
    "legal",
  ],
  DESIGN: ["design", "ux", "ui", "visual", "product designer"],
  MARKETING: ["marketing", "growth", "content", "social media", "brand", "community manager", "seo"],
  DATA_SCIENCE: ["data scientist", "analytics", "analyst", "bi", "experimentation", "a/b", "insights"],
  OTHER: [],
};

const CATEGORY_ALIASES: Record<string, MainCategory[]> = {
  ai: ["AI"],
  backend: ["BACKEND"],
  "front end": ["FRONT_END"],
  frontend: ["FRONT_END"],
  crypto: ["CRYPTO"],
  "non tech": ["NON_TECH", "MARKETING", "DESIGN"],
  design: ["DESIGN"],
  marketing: ["MARKETING"],
  "data science": ["DATA_SCIENCE"],
  sales: ["NON_TECH", "MARKETING"],
  support: ["NON_TECH"],
  "customer support": ["NON_TECH"],
  "community manager": ["MARKETING", "NON_TECH"],
  "social media manager": ["MARKETING"],
};

export function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function buildHaystack(job: FeedJob) {
  return normalizeText(`${job.title} ${job.company} ${job.location ?? ""} ${job.matchReason} ${job.description ?? ""}`);
}

export function classifyJobCategory(job: FeedJob): MainCategory {
  const haystack = buildHaystack(job);
  let best: MainCategory = "OTHER";
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as Array<[MainCategory, string[]]>) {
    if (category === "OTHER") continue;
    const score = keywords.filter((keyword) => haystack.includes(keyword)).length;
    if (score > bestScore) {
      best = category;
      bestScore = score;
    }
  }

  if (best !== "OTHER") return best;

  if (/engineer|developer|devops|architect/.test(haystack)) return "BACKEND";
  if (/designer|ux|ui/.test(haystack)) return "DESIGN";
  if (/marketing|growth|brand/.test(haystack)) return "MARKETING";
  if (/product manager|project manager|operations|support/.test(haystack)) return "NON_TECH";

  return "OTHER";
}

export function categoryLabel(category: MainCategory): string {
  return MAIN_CATEGORIES.find((item) => item.value === category)?.label ?? "Other";
}

export function expandSelectedCategories(selected: string[]): MainCategory[] {
  const expanded = new Set<MainCategory>();

  for (const raw of selected) {
    const normalized = normalizeText(raw);
    const aliases = CATEGORY_ALIASES[normalized];
    if (aliases) {
      aliases.forEach((category) => expanded.add(category));
      continue;
    }

    const exact = MAIN_CATEGORIES.find((category) => normalizeText(category.label) === normalized);
    if (exact) {
      expanded.add(exact.value);
    }
  }

  return [...expanded];
}

export function matchesCategoryByContent(job: FeedJob, category: MainCategory): boolean {
  if (category === "OTHER") return true;
  const haystack = buildHaystack(job);
  return CATEGORY_KEYWORDS[category].some((keyword) => haystack.includes(keyword));
}

export function filterJobsByTags<T extends FeedJob>(jobs: T[], selectedTags: string[], remoteOnly: boolean): T[] {
  const selectedCategories = expandSelectedCategories(selectedTags);

  return jobs.filter((job) => {
    if (remoteOnly && !job.isRemote) return false;
    if (selectedCategories.length === 0) return true;

    const classified = classifyJobCategory(job);
    if (selectedCategories.includes(classified)) return true;

    return selectedCategories.some((category) => matchesCategoryByContent(job, category));
  });
}

export type FeedJob = {
  title: string;
  company: string;
  location?: string;
  isRemote: boolean;
  matchReason: string;
  description?: string;
};

export type JobCategory = "TECH" | "NON_TECH" | "HYBRID";

const TAG_ALIASES: Record<string, string[]> = {
  "non tech": [
    "marketing",
    "design",
    "sales",
    "customer support",
    "community manager",
    "project manager",
    "product manager",
    "operations",
    "hr",
    "recruiter",
    "content",
    "growth",
  ],
};

const TAG_KEYWORDS: Record<string, string[]> = {
  marketing: ["marketing", "growth", "brand", "seo", "content"],
  design: ["designer", "ux", "ui", "product design", "visual"],
  sales: ["sales", "account executive", "business development", "partnership"],
  "customer support": ["customer support", "support", "customer success"],
  "community manager": ["community", "social", "discord", "ambassador"],
  "project manager": ["project manager", "program manager", "delivery manager"],
  "product manager": ["product manager", "product lead", "product owner"],
  operations: ["operations", "ops", "bizops"],
  hr: ["hr", "human resources", "people ops"],
  recruiter: ["recruiter", "talent", "sourcing"],
  content: ["content", "copywriter", "editor"],
  growth: ["growth", "performance marketing", "acquisition"],
};

const TECH_HINTS = [
  "engineer",
  "developer",
  "solidity",
  "backend",
  "frontend",
  "full stack",
  "smart contract",
  "devops",
  "data scientist",
  "security",
  "protocol",
];

const NON_TECH_HINTS = [
  "marketing",
  "design",
  "sales",
  "support",
  "community",
  "product manager",
  "operations",
  "recruiter",
  "people ops",
  "content",
  "growth",
];

function normalize(text: string) {
  return text.trim().toLowerCase();
}

function jobHaystack(job: FeedJob) {
  return normalize(`${job.title} ${job.company} ${job.location ?? ""} ${job.matchReason} ${job.description ?? ""}`);
}

function expandSelectedTags(selectedTags: string[]) {
  const normalized = selectedTags.map(normalize);
  const expanded = new Set<string>(normalized);

  for (const tag of normalized) {
    for (const alias of TAG_ALIASES[tag] ?? []) {
      expanded.add(alias);
    }
  }

  return [...expanded];
}

function matchesTag(haystack: string, tag: string) {
  if (haystack.includes(tag)) {
    return true;
  }
  const keywords = TAG_KEYWORDS[tag] ?? [];
  return keywords.some((keyword) => haystack.includes(keyword));
}

export function classifyJobCategory(job: FeedJob): JobCategory {
  const haystack = jobHaystack(job);
  const tech = TECH_HINTS.some((hint) => haystack.includes(hint));
  const nonTech = NON_TECH_HINTS.some((hint) => haystack.includes(hint));

  if (tech && nonTech) return "HYBRID";
  if (nonTech) return "NON_TECH";
  return "TECH";
}

export function filterJobsByTags<T extends FeedJob>(jobs: T[], selectedTags: string[], remoteOnly: boolean): T[] {
  const expandedTags = expandSelectedTags(selectedTags);

  return jobs.filter((job) => {
    if (remoteOnly && !job.isRemote) {
      return false;
    }

    if (expandedTags.length === 0) {
      return true;
    }

    const haystack = jobHaystack(job);
    return expandedTags.some((tag) => matchesTag(haystack, tag));
  });
}

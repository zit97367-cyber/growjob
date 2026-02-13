import { MainCategory, classifyJobCategory, normalizeText } from "@/lib/jobFilters";

type MatchProfile = {
  preferredRoles?: string[];
  skills?: string[];
  preferredLocation?: string | null;
  remoteOnly?: boolean;
};

type MatchInput = {
  resumeText: string;
  jobTitle: string;
  jobDescription?: string;
  jobLocation?: string | null;
  isRemote?: boolean;
  profile?: MatchProfile | null;
};

type MatchProbabilityResult = {
  probability: number;
  reason: string;
  suggestions: string[];
};

const ACTION_VERBS = ["built", "led", "delivered", "improved", "launched", "optimized", "scaled"];

function tokenize(value: string) {
  return normalizeText(value)
    .split(/[^a-z0-9+#.]+/)
    .filter((token) => token.length > 2);
}

function overlapScore(a: string[], b: string[]) {
  if (a.length === 0 || b.length === 0) return 0;
  const bSet = new Set(b);
  const hits = a.filter((item) => bSet.has(item)).length;
  return Math.min(1, hits / Math.max(4, a.length));
}

function inferCategoryFromText(jobTitle: string, jobDescription?: string): MainCategory {
  return classifyJobCategory({
    title: jobTitle,
    company: "",
    location: "",
    isRemote: false,
    matchReason: "",
    description: jobDescription,
  });
}

export function computeMatchProbability(input: MatchInput): MatchProbabilityResult {
  const resumeTokens = tokenize(input.resumeText);
  const jobTokens = tokenize(`${input.jobTitle} ${input.jobDescription ?? ""}`);
  const profileRoleTokens = tokenize((input.profile?.preferredRoles ?? []).join(" "));
  const profileSkillTokens = tokenize((input.profile?.skills ?? []).join(" "));

  const keywordOverlap = overlapScore(jobTokens, resumeTokens);
  const roleOverlap = overlapScore(profileRoleTokens, jobTokens);
  const skillOverlap = overlapScore(profileSkillTokens, jobTokens);

  const category = inferCategoryFromText(input.jobTitle, input.jobDescription);
  const roleText = normalizeText((input.profile?.preferredRoles ?? []).join(" "));
  const categoryAligned = category === "NON_TECH"
    ? /marketing|design|sales|support|manager|operations|community/.test(roleText)
    : /engineer|developer|data|ai|backend|frontend|crypto|solidity/.test(roleText);

  const remoteFits = input.profile?.remoteOnly ? Boolean(input.isRemote) : true;
  const locationFits = input.profile?.preferredLocation
    ? normalizeText(input.jobLocation ?? "").includes(normalizeText(input.profile.preferredLocation)) || Boolean(input.isRemote)
    : true;

  const verbHits = ACTION_VERBS.filter((verb) => normalizeText(input.resumeText).includes(verb)).length;
  const quantified = /\b\d+%|\b\d+\s*(x|years|m|k)\b/i.test(input.resumeText);
  const qualityScore = Math.min(1, verbHits / 4 + (quantified ? 0.25 : 0));

  let probability = 35;
  probability += keywordOverlap * 28;
  probability += roleOverlap * 18;
  probability += skillOverlap * 16;
  probability += categoryAligned ? 8 : -6;
  probability += remoteFits && locationFits ? 6 : -8;
  probability += qualityScore * 12;

  const bounded = Math.max(5, Math.min(98, Math.round(probability)));

  const reasonParts = [
    `${Math.round(keywordOverlap * 100)}% keyword overlap`,
    categoryAligned ? "category aligned" : "category mismatch",
    remoteFits ? "remote/location fit" : "location risk",
  ];

  const suggestions: string[] = [];
  if (keywordOverlap < 0.45) suggestions.push("Mirror more job keywords in your experience bullets.");
  if (roleOverlap < 0.4) suggestions.push("Align your summary to the target role title.");
  if (qualityScore < 0.45) suggestions.push("Add action verbs and quantified impact in recent roles.");
  if (!remoteFits || !locationFits) suggestions.push("Clarify location flexibility or remote availability.");
  if (suggestions.length === 0) suggestions.push("Strong alignment. Add one quantified achievement to increase confidence.");

  return {
    probability: bounded,
    reason: reasonParts.join(" + "),
    suggestions: suggestions.slice(0, 5),
  };
}

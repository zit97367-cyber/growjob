export type FeedJob = {
  id: string;
  title: string;
  company: string;
  location?: string;
  isRemote: boolean;
  description?: string;
  postedAt: string;
  matchReason?: string;
  verificationTier?: "UNVERIFIED" | "DOMAIN_VERIFIED" | "SOURCE_VERIFIED";
  jobCategory?: "AI" | "BACKEND" | "FRONT_END" | "CRYPTO" | "NON_TECH" | "DESIGN" | "MARKETING" | "DATA_SCIENCE" | "OTHER";
  salaryMinUsd?: number | null;
  salaryMaxUsd?: number | null;
  salaryInferred?: boolean;
  sectionLabel?: string;
  displaySalary?: string;
  riskLevel?: "LOW" | "MEDIUM" | "HIGH";
  applyUrl?: string;
};

export type TokenState = {
  weeklyLimit: number;
  bonusTokensBought: number;
  usedTokens: number;
  tokensLeft: number;
};

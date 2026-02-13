export type VerificationStatus = "SOURCE_VERIFIED" | "DOMAIN_VERIFIED" | "UNVERIFIED";

const ATS_DOMAINS = ["greenhouse.io", "lever.co", "ashbyhq.com", "smartrecruiters.com"];

export function timeAgo(dateInput: string | Date) {
  const date = new Date(dateInput);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function daysAgo(dateInput: string | Date) {
  const date = new Date(dateInput);
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)));
}

export function inferredVerification(applyUrl?: string, tier?: string | null): VerificationStatus {
  if (tier === "SOURCE_VERIFIED" || tier === "DOMAIN_VERIFIED" || tier === "UNVERIFIED") {
    return tier;
  }
  if (!applyUrl) return "UNVERIFIED";

  const url = applyUrl.toLowerCase();
  if (ATS_DOMAINS.some((domain) => url.includes(domain))) {
    return "SOURCE_VERIFIED";
  }
  return "UNVERIFIED";
}

export function isFreshWithinDays(dateInput: string | Date, days: number) {
  return daysAgo(dateInput) <= days;
}

export function deriveMatchReason(params: {
  job: {
    title: string;
    company: string;
    location?: string;
    isRemote: boolean;
    description?: string;
    matchReason?: string;
    salaryMinUsd?: number | null;
    salaryMaxUsd?: number | null;
    jobCategory?: string;
  };
  selectedCategory?: string;
  query?: string;
  salaryFloorK?: number;
}) {
  if (params.job.matchReason && params.job.matchReason.trim().length > 3) {
    return params.job.matchReason;
  }

  const reasons: string[] = [];
  const text = `${params.job.title} ${params.job.description ?? ""}`.toLowerCase();

  if (params.job.isRemote) reasons.push("Remote fit");
  if (params.selectedCategory && params.job.jobCategory === params.selectedCategory) {
    reasons.push("matches your selected category");
  }

  if (params.query?.trim()) {
    const q = params.query.trim().toLowerCase();
    if (text.includes(q) || params.job.company.toLowerCase().includes(q)) {
      reasons.push(`matches keyword: ${params.query.trim()}`);
    }
  }

  if (params.salaryFloorK && (params.job.salaryMinUsd ?? 0) >= params.salaryFloorK * 1000) {
    reasons.push("within your salary preference");
  }

  if (reasons.length === 0) {
    if (/solidity|smart contract|evm|defi/.test(text)) return "Matches keyword: Solidity";
    if (/marketing|growth|community|social/.test(text)) return "Relevant non-tech growth role";
    return "Strong fit based on role and recency";
  }

  return reasons.slice(0, 2).join(" + ");
}

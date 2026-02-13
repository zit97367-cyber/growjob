import { UnifiedJob } from "@/lib/ingest/types";

export type VerificationTier = "SOURCE_VERIFIED" | "DOMAIN_VERIFIED" | "UNVERIFIED";

const KNOWN_ATS_HOSTS = [
  "greenhouse.io",
  "boards.greenhouse.io",
  "boards-api.greenhouse.io",
  "jobs.lever.co",
  "api.lever.co",
];

function hostname(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function hostMatchesDomain(host: string, domain: string) {
  const clean = domain.toLowerCase().replace(/^www\./, "");
  return host === clean || host.endsWith(`.${clean}`);
}

export function computeVerificationTier(job: UnifiedJob): VerificationTier {
  if (job.source === "GREENHOUSE" || job.source === "LEVER") {
    return "SOURCE_VERIFIED";
  }

  const host = hostname(job.applyUrl);
  if (!host) return "UNVERIFIED";

  if (KNOWN_ATS_HOSTS.some((ats) => host === ats || host.endsWith(`.${ats}`))) {
    return "DOMAIN_VERIFIED";
  }

  if (job.websiteDomain && hostMatchesDomain(host, job.websiteDomain)) {
    return "DOMAIN_VERIFIED";
  }

  return "UNVERIFIED";
}

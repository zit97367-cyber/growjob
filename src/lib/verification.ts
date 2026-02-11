import { ATS_DOMAINS } from "@/lib/constants";
import { VerificationTier } from "@prisma/client";

export function computeVerificationTier(
  sourceVerified: boolean,
  applyUrl: string,
  companyDomain: string,
): VerificationTier {
  if (sourceVerified) {
    return VerificationTier.SOURCE_VERIFIED;
  }

  const host = safeHost(applyUrl);
  if (!host) {
    return VerificationTier.UNVERIFIED;
  }

  if (host.endsWith(companyDomain) || ATS_DOMAINS.some((d) => host.endsWith(d))) {
    return VerificationTier.DOMAIN_VERIFIED;
  }

  return VerificationTier.UNVERIFIED;
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

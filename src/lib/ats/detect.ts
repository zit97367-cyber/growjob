import { AtsType } from "@prisma/client";

export function detectAtsFromUrl(careersUrl: string): { atsType: AtsType; atsConfig: Record<string, string> } {
  const lower = careersUrl.toLowerCase();

  if (lower.includes("greenhouse.io")) {
    const token = lastSegment(careersUrl);
    return { atsType: AtsType.GREENHOUSE, atsConfig: { boardToken: token } };
  }

  if (lower.includes("jobs.lever.co")) {
    const handle = lastSegment(careersUrl);
    return { atsType: AtsType.LEVER, atsConfig: { handle } };
  }

  if (lower.includes("ashbyhq.com")) {
    const orgSlug = lastSegment(careersUrl);
    return { atsType: AtsType.ASHBY, atsConfig: { orgSlug } };
  }

  if (lower.includes("smartrecruiters.com")) {
    const companyIdentifier = lastSegment(careersUrl);
    return { atsType: AtsType.SMARTRECRUITERS, atsConfig: { companyIdentifier } };
  }

  return { atsType: AtsType.UNKNOWN, atsConfig: {} };
}

function lastSegment(url: string) {
  const clean = url.replace(/\/$/, "");
  return clean.split("/").pop() ?? "";
}

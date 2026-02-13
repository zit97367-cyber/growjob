import { describe, expect, it } from "vitest";
import { computeVerificationTier } from "@/lib/verify";

describe("computeVerificationTier", () => {
  it("marks official ATS sources as SOURCE_VERIFIED", () => {
    const tier = computeVerificationTier({
      id: "1",
      title: "Engineer",
      company: "Acme",
      location: null,
      remote: true,
      description: null,
      applyUrl: "https://jobs.lever.co/acme/123",
      postedAt: null,
      firstSeenAt: new Date().toISOString(),
      source: "LEVER",
    });
    expect(tier).toBe("SOURCE_VERIFIED");
  });

  it("marks matching website domain as DOMAIN_VERIFIED", () => {
    const tier = computeVerificationTier({
      id: "1",
      title: "Engineer",
      company: "Acme",
      location: null,
      remote: true,
      description: null,
      applyUrl: "https://careers.acme.com/jobs/1",
      postedAt: null,
      firstSeenAt: new Date().toISOString(),
      source: "REMOTIVE",
      websiteDomain: "acme.com",
    });
    expect(tier).toBe("DOMAIN_VERIFIED");
  });
});

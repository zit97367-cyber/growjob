import { describe, expect, it } from "vitest";
import { computeMatchProbability } from "@/lib/matchProbability";

describe("match probability", () => {
  const input = {
    resumeText: "Built defi protocol APIs, led backend team, improved latency by 35%.",
    jobTitle: "Backend Engineer",
    jobDescription: "Build APIs for crypto infrastructure and scale backend services.",
    isRemote: true,
    jobLocation: "Remote",
    profile: {
      preferredRoles: ["Backend Engineer"],
      skills: ["api", "backend", "crypto"],
      preferredLocation: "Remote",
      remoteOnly: true,
    },
  };

  it("is deterministic for the same input", () => {
    const first = computeMatchProbability(input);
    const second = computeMatchProbability(input);
    expect(first).toEqual(second);
  });

  it("keeps probability in valid bounds", () => {
    const result = computeMatchProbability(input);
    expect(result.probability).toBeGreaterThanOrEqual(0);
    expect(result.probability).toBeLessThanOrEqual(100);
    expect(result.reason.length).toBeGreaterThan(5);
  });
});

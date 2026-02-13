import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getAuthSession = vi.fn();
const awardCredit = vi.fn();
const logEvent = vi.fn();
const prisma = {
  resume: { findFirst: vi.fn() },
  userProfile: { findUnique: vi.fn() },
  job: { findUnique: vi.fn() },
  atsScan: { create: vi.fn() },
};

vi.mock("@/lib/auth", () => ({ getAuthSession }));
vi.mock("@/lib/credits", () => ({ awardCredit }));
vi.mock("@/lib/events", () => ({ logEvent }));
vi.mock("@/lib/prisma", () => ({ prisma }));

describe("POST /api/resume/scan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.resume.findFirst.mockResolvedValue({ id: "r1", content: "Built APIs and improved latency by 20%" });
    prisma.userProfile.findUnique.mockResolvedValue({ preferredRoles: ["Backend Engineer"], skills: ["api", "node"], remoteOnly: true });
    prisma.job.findUnique.mockResolvedValue({
      id: "j1",
      title: "Backend Engineer",
      description: "Build backend APIs for crypto product",
      location: "Remote",
      isRemote: true,
    });
    prisma.atsScan.create.mockResolvedValue({
      id: "s1",
      score: 75,
      matchProbability: 68,
      matchReason: "test",
      improvements: ["one"],
      missingKeywords: ["two"],
      detailedSuggestions: ["three"],
      tailoredOutput: "premium",
    });
  });

  it("hides premium suggestion fields for free users", async () => {
    getAuthSession.mockResolvedValue({ user: { id: "u1", isPremium: false } });
    const { POST } = await import("@/app/api/resume/scan/route");

    const req = new NextRequest("http://localhost/api/resume/scan", {
      method: "POST",
      body: JSON.stringify({ resumeId: "r1", jobId: "j1" }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.scan.detailedSuggestions).toEqual([]);
    expect(body.scan.tailoredOutput).toBeNull();
    expect(awardCredit).toHaveBeenCalledWith("u1", "ATS_SCAN");
  });

  it("returns detailed suggestions for premium users", async () => {
    getAuthSession.mockResolvedValue({ user: { id: "u1", isPremium: true } });
    const { POST } = await import("@/app/api/resume/scan/route");

    const req = new NextRequest("http://localhost/api/resume/scan", {
      method: "POST",
      body: JSON.stringify({ resumeId: "r1", jobId: "j1" }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.scan.detailedSuggestions).toEqual(["three"]);
    expect(body.scan.tailoredOutput).toBe("premium");
    expect(logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "ats_scan",
        metadata: expect.objectContaining({ matchProbability: expect.any(Number), isPremiumView: true }),
      }),
    );
  });

  it("returns 400 without job context", async () => {
    getAuthSession.mockResolvedValue({ user: { id: "u1", isPremium: false } });
    prisma.job.findUnique.mockResolvedValue(null);

    const { POST } = await import("@/app/api/resume/scan/route");
    const req = new NextRequest("http://localhost/api/resume/scan", {
      method: "POST",
      body: JSON.stringify({ resumeId: "r1" }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

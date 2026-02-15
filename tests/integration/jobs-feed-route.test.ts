import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getAuthSession = vi.fn();
const logEvent = vi.fn();
const prisma = {
  job: { findMany: vi.fn() },
  userProfile: { findUnique: vi.fn() },
  userJobAction: { findMany: vi.fn() },
};

vi.mock("@/lib/auth", () => ({ getAuthSession }));
vi.mock("@/lib/events", () => ({ logEvent }));
vi.mock("@/lib/prisma", () => ({ prisma }));

describe("GET /api/jobs/feed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthSession.mockResolvedValue(null);
    prisma.job.findMany.mockResolvedValue([
      {
        id: "j1",
        title: "Marketing Manager",
        location: "Remote",
        isRemote: true,
        description: "growth and content",
        applyUrl: "https://jobs.example/1",
        publishedAt: new Date("2026-02-10T00:00:00Z"),
        firstSeenAt: new Date("2026-02-10T00:00:00Z"),
        verificationTier: "SOURCE_VERIFIED",
        sourceReliability: 100,
        salaryMinUsd: 120000,
        salaryMaxUsd: 150000,
        salaryInferred: false,
        jobCategory: "MARKETING",
        company: { name: "LayerX" },
      },
    ]);
  });

  it("passes category/salary/query filters into DB query", async () => {
    const { GET } = await import("@/app/api/jobs/feed/route");
    const req = new NextRequest(
      "http://localhost/api/jobs/feed?category=MARKETING&salaryFloorK=110&q=marketing&remoteOnly=true&limit=5&offset=3",
    );

    const res = await GET(req);
    expect(res.status).toBe(200);

    expect(prisma.job.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          jobCategory: "MARKETING",
          isRemote: true,
          AND: expect.any(Array),
        }),
      }),
    );
  });

  it("returns salary and category metadata", async () => {
    const { GET } = await import("@/app/api/jobs/feed/route");
    const req = new NextRequest("http://localhost/api/jobs/feed?salaryFloorK=10");

    const res = await GET(req);
    const body = await res.json();

    expect(body.jobs[0]).toEqual(
      expect.objectContaining({
        jobCategory: "MARKETING",
        salaryMinUsd: 120000,
        salaryMaxUsd: 150000,
      }),
    );
    expect(body.meta).toEqual(
      expect.objectContaining({
        limit: 30,
        offset: 0,
        source: "PERSONALIZED",
        totalApprox: 1,
      }),
    );
    expect(logEvent).not.toHaveBeenCalled();
  });

  it("does not fail response when event logging rejects", async () => {
    getAuthSession.mockResolvedValue({ user: { id: "u1" } });
    logEvent.mockRejectedValue(new Error("telemetry down"));
    const { GET } = await import("@/app/api/jobs/feed/route");
    const req = new NextRequest("http://localhost/api/jobs/feed?limit=10&offset=0");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.jobs).toHaveLength(1);
    expect(body.meta.limit).toBe(10);
  });
});

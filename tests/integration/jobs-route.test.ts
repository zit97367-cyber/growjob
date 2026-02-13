import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getJobsCacheOrRefresh = vi.fn();
vi.mock("@/lib/ingest/index", () => ({ getJobsCacheOrRefresh }));

describe("GET /api/jobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getJobsCacheOrRefresh.mockResolvedValue({
      generatedAt: "2026-02-13T00:00:00.000Z",
      jobs: [
        {
          id: "1",
          title: "Solidity Engineer",
          company: "Acme",
          location: "Remote",
          remote: true,
          description: "defi and smart contract",
          applyUrl: "https://jobs.lever.co/acme/123",
          postedAt: new Date().toISOString(),
          firstSeenAt: new Date().toISOString(),
          source: "LEVER",
          websiteDomain: "acme.com",
        },
        {
          id: "2",
          title: "Marketing Manager",
          company: "Brand3",
          location: "NYC",
          remote: false,
          description: "brand growth",
          applyUrl: "https://brand3.com/jobs/1",
          postedAt: new Date().toISOString(),
          firstSeenAt: new Date().toISOString(),
          source: "REMOTIVE",
          websiteDomain: "brand3.com",
        },
      ],
    });
  });

  it("filters by tag and verified flag", async () => {
    const { GET } = await import("@/app/api/jobs/route");
    const req = new NextRequest("http://localhost/api/jobs?tag=defi&verifiedOnly=true");

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.count).toBe(1);
    expect(body.jobs[0].verificationTier).toBe("SOURCE_VERIFIED");
  });

  it("applies days cap max 14", async () => {
    const { GET } = await import("@/app/api/jobs/route");
    const req = new NextRequest("http://localhost/api/jobs?days=99");
    const res = await GET(req);
    const body = await res.json();

    expect(body.filters.days).toBe(14);
  });
});

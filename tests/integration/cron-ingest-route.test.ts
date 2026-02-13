import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const ingestAndCacheJobs = vi.fn();
vi.mock("@/lib/ingest/index", () => ({ ingestAndCacheJobs }));

describe("POST /api/cron/ingest", () => {
  const originalCronSecret = process.env.CRON_SECRET;
  const originalIngestSecret = process.env.INGEST_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INGEST_SECRET = "test-secret";
    delete process.env.CRON_SECRET;
  });

  it("rejects unauthorized request", async () => {
    const { POST } = await import("@/app/api/cron/ingest/route");

    const req = new Request("http://localhost/api/cron/ingest", {
      method: "POST",
      headers: { "x-ingest-secret": "wrong" },
    }) as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(ingestAndCacheJobs).not.toHaveBeenCalled();
  });

  it("runs ingestion when secret is valid", async () => {
    ingestAndCacheJobs.mockResolvedValue({
      cache: { generatedAt: "2026-02-13T00:00:00.000Z", jobs: [] },
      stats: {
        generatedAt: "2026-02-13T00:00:00.000Z",
        jobsSeen: 2,
        jobsKept: 2,
        jobsDeduped: 0,
        sourceBreakdown: [{ source: "GREENHOUSE", seen: 2, kept: 2 }],
      },
    });
    const { POST } = await import("@/app/api/cron/ingest/route");

    const req = new Request("http://localhost/api/cron/ingest", {
      method: "POST",
      headers: { "x-ingest-secret": "test-secret" },
    }) as unknown as NextRequest;

    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.stats.jobsSeen).toBe(2);
    expect(body.stats.sourceBreakdown).toHaveLength(1);
  });

  afterAll(() => {
    process.env.CRON_SECRET = originalCronSecret;
    process.env.INGEST_SECRET = originalIngestSecret;
  });
});

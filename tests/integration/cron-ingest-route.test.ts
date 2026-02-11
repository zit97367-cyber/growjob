import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const ingestAllCompanies = vi.fn();
vi.mock("@/lib/ingest", () => ({ ingestAllCompanies }));

describe("POST /api/cron/ingest", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-secret";
  });

  it("rejects unauthorized request", async () => {
    const { POST } = await import("@/app/api/cron/ingest/route");

    const req = new Request("http://localhost/api/cron/ingest", {
      method: "POST",
      headers: { "x-cron-secret": "wrong" },
    }) as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(ingestAllCompanies).not.toHaveBeenCalled();
  });

  it("runs ingestion when secret is valid", async () => {
    ingestAllCompanies.mockResolvedValue({ companiesProcessed: 1, jobsSeen: 2, jobsUpserted: 2 });
    const { POST } = await import("@/app/api/cron/ingest/route");

    const req = new Request("http://localhost/api/cron/ingest", {
      method: "POST",
      headers: { "x-cron-secret": "test-secret" },
    }) as unknown as NextRequest;

    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.stats.jobsSeen).toBe(2);
  });

  afterAll(() => {
    process.env.CRON_SECRET = originalSecret;
  });
});

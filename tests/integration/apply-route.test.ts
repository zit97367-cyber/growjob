import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getAuthSession = vi.fn();
const trySpendApplyToken = vi.fn();
const refundApplyToken = vi.fn();
const logEvent = vi.fn();

const prisma = {
  job: { findUnique: vi.fn() },
  userJobAction: { upsert: vi.fn() },
};

vi.mock("@/lib/auth", () => ({ getAuthSession }));
vi.mock("@/lib/applyTokens", () => ({ trySpendApplyToken, refundApplyToken }));
vi.mock("@/lib/events", () => ({ logEvent }));
vi.mock("@/lib/prisma", () => ({ prisma }));

describe("POST /api/jobs/[jobId]/apply", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
      }),
    );
  });

  it("returns 401 for anonymous user", async () => {
    getAuthSession.mockResolvedValue(null);
    const { POST } = await import("@/app/api/jobs/[jobId]/apply/route");

    const res = await POST(new Request("http://localhost") as unknown as NextRequest, {
      params: Promise.resolve({ jobId: "job1" }),
    });

    expect(res.status).toBe(401);
  });

  it("returns 402 when tokens are exhausted", async () => {
    getAuthSession.mockResolvedValue({ user: { id: "u1", isPremium: false } });
    prisma.job.findUnique.mockResolvedValue({ id: "job1", applyUrl: "https://jobs.example/1" });
    trySpendApplyToken.mockResolvedValue({ ok: false });

    const { POST } = await import("@/app/api/jobs/[jobId]/apply/route");
    const res = await POST(new Request("http://localhost", { method: "POST" }) as unknown as NextRequest, {
      params: Promise.resolve({ jobId: "job1" }),
    });

    expect(res.status).toBe(402);
    expect(logEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "paywall_view" }));
  });

  it("returns redirect URL on success", async () => {
    getAuthSession.mockResolvedValue({ user: { id: "u1", isPremium: true } });
    prisma.job.findUnique.mockResolvedValue({ id: "job1", applyUrl: "https://jobs.example/1" });
    trySpendApplyToken.mockResolvedValue({ ok: true, tokensLeft: 5 });
    prisma.userJobAction.upsert.mockResolvedValue({});

    const { POST } = await import("@/app/api/jobs/[jobId]/apply/route");
    const res = await POST(new Request("http://localhost", { method: "POST" }) as unknown as NextRequest, {
      params: Promise.resolve({ jobId: "job1" }),
    });

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.redirectUrl).toBe("https://jobs.example/1");
    expect(prisma.userJobAction.upsert).toHaveBeenCalled();
  });
});

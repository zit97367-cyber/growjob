import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const constructEvent = vi.fn();
const logEvent = vi.fn();

const prisma = {
  user: {
    update: vi.fn(),
  },
};

vi.mock("stripe", () => {
  return {
    default: class MockStripe {
      webhooks = {
        constructEvent,
      };
    },
  };
});

vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/events", () => ({ logEvent }));

describe("POST /api/stripe/webhook", () => {
  const originalKey = process.env.STRIPE_SECRET_KEY;
  const originalWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_123";
  });

  it("upgrades user when checkout completed event arrives", async () => {
    constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_123",
          metadata: { userId: "u1" },
        },
      },
    });

    const { POST } = await import("@/app/api/stripe/webhook/route");

    const req = new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": "t=1,v1=abc" },
      body: JSON.stringify({ any: "payload" }),
    }) as unknown as NextRequest;

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.received).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { isPremium: true },
    });
    expect(logEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "premium_upgrade", userId: "u1" }),
    );
  });

  it("rejects invalid signature", async () => {
    constructEvent.mockImplementation(() => {
      throw new Error("bad sig");
    });

    const { POST } = await import("@/app/api/stripe/webhook/route");

    const req = new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": "invalid" },
      body: "{}",
    }) as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  afterAll(() => {
    process.env.STRIPE_SECRET_KEY = originalKey;
    process.env.STRIPE_WEBHOOK_SECRET = originalWebhookSecret;
  });
});

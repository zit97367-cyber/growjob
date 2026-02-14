import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getAuthSession = vi.fn();
const ensureInitialCredits = vi.fn();
const getCreditsBalance = vi.fn();
const awardCredit = vi.fn();

const prisma = {
  userProfile: { findUnique: vi.fn(), upsert: vi.fn() },
  user: { findUnique: vi.fn(), update: vi.fn() },
  $transaction: vi.fn(),
};

vi.mock("@/lib/auth", () => ({ getAuthSession }));
vi.mock("@/lib/credits", () => ({ ensureInitialCredits, getCreditsBalance, awardCredit }));
vi.mock("@/lib/prisma", () => ({ prisma }));

describe("/api/profile route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthSession.mockResolvedValue({ user: { id: "u1", name: "Alice", email: "a@example.com", image: null } });
    ensureInitialCredits.mockResolvedValue(undefined);
    getCreditsBalance.mockResolvedValue(7);
  });

  it("GET returns identity with phone and designation", async () => {
    prisma.userProfile.findUnique.mockResolvedValue({
      userId: "u1",
      preferredRoles: ["Engineer"],
      designation: "Engineer",
    });
    prisma.user.findUnique.mockResolvedValue({
      name: "Alice",
      image: null,
      email: "a@example.com",
      phoneNumber: "+1 555",
    });

    const { GET } = await import("@/app/api/profile/route");
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.identity.name).toBe("Alice");
    expect(body.identity.phoneNumber).toBe("+1 555");
    expect(body.identity.designation).toBe("Engineer");
  });

  it("PUT updates user + profile with new identity fields", async () => {
    prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => Promise<unknown>) => {
      return cb(prisma as typeof prisma);
    });
    prisma.userProfile.upsert.mockResolvedValue({ preferredRoles: ["PM"], designation: "PM" });

    const { PUT } = await import("@/app/api/profile/route");
    const req = new NextRequest("http://localhost/api/profile", {
      method: "PUT",
      body: JSON.stringify({
        name: "Bob",
        phoneNumber: "+1 222",
        designation: "PM",
        preferredRoles: ["PM"],
        skills: ["analytics"],
        interests: ["growth"],
      }),
      headers: { "content-type": "application/json" },
    });

    const res = await PUT(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: "Bob", phoneNumber: "+1 222" }) }),
    );
    expect(body.identity.designation).toBe("PM");
    expect(awardCredit).toHaveBeenCalledWith("u1", "PROFILE_COMPLETE");
  });
});

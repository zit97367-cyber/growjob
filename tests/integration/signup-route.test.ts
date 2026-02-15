import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const hashPassword = vi.fn();
const validatePassword = vi.fn();
const consumeRateLimit = vi.fn();
const isAdminEmail = vi.fn();

const prisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
};

vi.mock("@/lib/password", () => ({ hashPassword, validatePassword }));
vi.mock("@/lib/rateLimit", () => ({ consumeRateLimit }));
vi.mock("@/lib/security", () => ({ isAdminEmail }));
vi.mock("@/lib/prisma", () => ({ prisma }));

describe("/api/auth/signup route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consumeRateLimit.mockReturnValue({ allowed: true });
    validatePassword.mockReturnValue({ ok: true });
    hashPassword.mockResolvedValue("hashed");
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: "u1" });
    isAdminEmail.mockReturnValue(false);
  });

  it("creates a new account and stores hash", async () => {
    const { POST } = await import("@/app/api/auth/signup/route");

    const req = new NextRequest("http://localhost/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Alice",
        email: "ALICE@example.com",
        password: "Secure123",
      }),
      headers: { "content-type": "application/json", "x-forwarded-for": "127.0.0.1" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "alice@example.com",
          passwordHash: "hashed",
        }),
      }),
    );
  });

  it("rejects duplicate account", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "existing" });
    const { POST } = await import("@/app/api/auth/signup/route");
    const req = new NextRequest("http://localhost/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        email: "alice@example.com",
        password: "Secure123",
      }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(409);
  });

  it("returns handled error when user creation fails", async () => {
    prisma.user.create.mockRejectedValue(new Error("db down"));
    const { POST } = await import("@/app/api/auth/signup/route");
    const req = new NextRequest("http://localhost/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        email: "new@example.com",
        password: "Secure123",
      }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.error).toContain("Unable to create account");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  creditLedger: {
    count: vi.fn(),
    create: vi.fn(),
    aggregate: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

describe("ensureInitialCredits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates initial 7-credit entry for new user", async () => {
    prismaMock.creditLedger.count.mockResolvedValue(0);

    const { ensureInitialCredits } = await import("@/lib/credits");
    await ensureInitialCredits("u1");

    expect(prismaMock.creditLedger.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "u1",
        amount: 7,
      }),
    });
  });

  it("is idempotent when ledger already has entries", async () => {
    prismaMock.creditLedger.count.mockResolvedValue(2);

    const { ensureInitialCredits } = await import("@/lib/credits");
    await ensureInitialCredits("u1");

    expect(prismaMock.creditLedger.create).not.toHaveBeenCalled();
  });
});

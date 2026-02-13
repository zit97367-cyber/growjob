import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getAuthSession = vi.fn();
const put = vi.fn();
const del = vi.fn();

const prisma = {
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock("@/lib/auth", () => ({ getAuthSession }));
vi.mock("@vercel/blob", () => ({ put, del }));
vi.mock("@/lib/prisma", () => ({ prisma }));

describe("POST /api/profile/avatar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BLOB_READ_WRITE_TOKEN = "blob-token";
  });

  it("returns 401 when unauthorized", async () => {
    getAuthSession.mockResolvedValue(null);
    const { POST } = await import("@/app/api/profile/avatar/route");

    const form = new FormData();
    form.append("file", new File([new Uint8Array([1, 2, 3])], "a.png", { type: "image/png" }));
    const req = new Request("http://localhost/api/profile/avatar", { method: "POST", body: form }) as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid mime type", async () => {
    getAuthSession.mockResolvedValue({ user: { id: "u1" } });
    const { POST } = await import("@/app/api/profile/avatar/route");

    const form = new FormData();
    form.append("file", new File(["x"], "a.txt", { type: "text/plain" }));
    const req = new Request("http://localhost/api/profile/avatar", { method: "POST", body: form }) as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("uploads avatar and updates user image", async () => {
    getAuthSession.mockResolvedValue({ user: { id: "u1" } });
    prisma.user.findUnique.mockResolvedValue({ image: null });
    put.mockResolvedValue({ url: "https://public.blob.vercel-storage.com/avatars/u1/new.jpg" });
    prisma.user.update.mockResolvedValue({});

    const { POST } = await import("@/app/api/profile/avatar/route");

    const form = new FormData();
    form.append("file", new File([new Uint8Array([1, 2, 3])], "avatar.jpg", { type: "image/jpeg" }));
    const req = new Request("http://localhost/api/profile/avatar", { method: "POST", body: form }) as unknown as NextRequest;

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(prisma.user.update).toHaveBeenCalled();
    expect(put).toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
  });
});

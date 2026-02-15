import { describe, expect, it } from "vitest";
import { hashPassword, validatePassword, verifyPassword } from "@/lib/password";

describe("password helpers", () => {
  it("hashes and verifies", async () => {
    const hash = await hashPassword("Secure123");
    expect(hash).toBeTruthy();
    await expect(verifyPassword("Secure123", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-pass", hash)).resolves.toBe(false);
  });

  it("rejects weak passwords", () => {
    expect(validatePassword("short").ok).toBe(false);
    expect(validatePassword("allletters").ok).toBe(false);
    expect(validatePassword("12345678").ok).toBe(false);
    expect(validatePassword("Good1234").ok).toBe(true);
  });
});

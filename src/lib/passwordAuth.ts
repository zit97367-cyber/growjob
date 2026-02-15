import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEYLEN = 64;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(password, salt, KEYLEN).toString("hex");
  return `${salt}:${digest}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, digest] = stored.split(":");
  if (!salt || !digest) return false;

  const computed = scryptSync(password, salt, KEYLEN).toString("hex");
  try {
    return timingSafeEqual(Buffer.from(digest, "hex"), Buffer.from(computed, "hex"));
  } catch {
    return false;
  }
}

export function validatePassword(password: string) {
  return password.length >= 8;
}

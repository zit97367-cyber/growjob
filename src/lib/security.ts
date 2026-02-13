export function assertCronSecret(secretHeader?: string | null): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return true;
  }
  return secretHeader === expected;
}

export function assertIngestSecret(secretHeader?: string | null): boolean {
  const expected = process.env.INGEST_SECRET ?? process.env.CRON_SECRET;
  if (!expected) {
    return true;
  }
  return secretHeader === expected;
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) {
    return false;
  }
  const raw = process.env.ADMIN_EMAILS ?? "";
  const allowList = raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return allowList.includes(email.toLowerCase());
}

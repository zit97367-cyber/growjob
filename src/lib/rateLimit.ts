type Entry = {
  attempts: number;
  resetAt: number;
};

const buckets = new Map<string, Entry>();

export function consumeRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { attempts: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (current.attempts >= limit) {
    return { allowed: false, remaining: 0 };
  }

  current.attempts += 1;
  return { allowed: true, remaining: Math.max(0, limit - current.attempts) };
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}

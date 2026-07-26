type Entry = { count: number; resetAt: number };
const entries = new Map<string, Entry>();

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = entries.get(key);
  if (!current || current.resetAt <= now) {
    entries.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }
  current.count += 1;
  if (entries.size > 10_000) {
    for (const [entryKey, entry] of entries) if (entry.resetAt <= now) entries.delete(entryKey);
  }
  return { allowed: current.count <= limit, remaining: Math.max(0, limit - current.count), retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000) };
}

export function requestAddress(headers: Headers) {
  return (headers.get('x-forwarded-for')?.split(',')[0] ?? headers.get('x-real-ip') ?? 'unknown').trim();
}

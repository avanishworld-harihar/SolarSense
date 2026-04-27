/**
 * Tiny in-memory token-bucket rate limiter.
 *
 * Trade-offs (read before extending):
 *   - Per-process state, so it does NOT survive deploys / scale-out. That's
 *     fine for an MVP website-form throttle (the goal is to slow casual abuse,
 *     not to be a fortress); upgrade to Upstash / Redis when traffic warrants.
 *   - Map keys are normalized identifiers (typically IP). Keep them short.
 *   - Buckets are evicted lazily after `windowMs` of inactivity to bound memory.
 */

type Bucket = {
  tokens: number;
  lastRefill: number;
};

const STORE = new Map<string, Bucket>();
const EVICTION_THRESHOLD = 1000;

export type RateLimitResult = {
  allowed: boolean;
  retryAfterMs: number;
  remaining: number;
};

export function tokenBucket({
  key,
  capacity,
  refillIntervalMs
}: {
  key: string;
  /** Max burst. */
  capacity: number;
  /** ms required to regain ONE token. */
  refillIntervalMs: number;
}): RateLimitResult {
  const now = Date.now();
  const existing = STORE.get(key);
  if (!existing) {
    STORE.set(key, { tokens: capacity - 1, lastRefill: now });
    if (STORE.size > EVICTION_THRESHOLD) evictStale(now, refillIntervalMs * capacity);
    return { allowed: true, retryAfterMs: 0, remaining: capacity - 1 };
  }
  const elapsed = now - existing.lastRefill;
  const earned = Math.floor(elapsed / refillIntervalMs);
  const refilled = Math.min(capacity, existing.tokens + earned);
  const lastRefill = earned > 0 ? existing.lastRefill + earned * refillIntervalMs : existing.lastRefill;
  if (refilled <= 0) {
    return {
      allowed: false,
      retryAfterMs: Math.max(0, refillIntervalMs - (now - lastRefill)),
      remaining: 0
    };
  }
  STORE.set(key, { tokens: refilled - 1, lastRefill });
  return { allowed: true, retryAfterMs: 0, remaining: refilled - 1 };
}

function evictStale(now: number, maxAgeMs: number) {
  for (const [k, v] of STORE.entries()) {
    if (now - v.lastRefill > maxAgeMs) STORE.delete(k);
  }
}

/** Best-effort client IP extraction from common edge / proxy headers. */
export function extractClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    headers.get("x-client-ip") ||
    "unknown"
  );
}

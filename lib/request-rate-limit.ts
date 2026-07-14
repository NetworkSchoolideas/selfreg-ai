type RateLimitOptions = {
  windowMs: number;
  maxRequests: number;
  maxInFlight: number;
};

type RateLimitEntry = {
  windowStartedAt: number;
  requestCount: number;
  inFlight: number;
};

type RateLimitResult =
  | { allowed: false }
  | { allowed: true; release: () => void };

const entries = new Map<string, RateLimitEntry>();

/**
 * A lightweight per-process guard against accidental request bursts and
 * concurrent provider calls. It deliberately contains no request content or
 * credentials; distributed quota enforcement belongs to production infra.
 */
export function acquireRequestSlot(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const existing = entries.get(key);
  const entry = !existing || now - existing.windowStartedAt >= options.windowMs
    ? { windowStartedAt: now, requestCount: 0, inFlight: 0 }
    : existing;

  if (entry.requestCount >= options.maxRequests || entry.inFlight >= options.maxInFlight) {
    entries.set(key, entry);
    return { allowed: false };
  }

  entry.requestCount += 1;
  entry.inFlight += 1;
  entries.set(key, entry);

  let released = false;
  return {
    allowed: true,
    release() {
      if (released) return;
      released = true;
      const current = entries.get(key);
      if (current) current.inFlight = Math.max(0, current.inFlight - 1);
    },
  };
}

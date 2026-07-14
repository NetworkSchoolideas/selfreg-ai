import { acquireRequestSlot } from "@/lib/request-rate-limit";

describe("request rate limit", () => {
  it("limits requests within the configured window", () => {
    const key = `request-limit-${Date.now()}`;
    const first = acquireRequestSlot(key, { windowMs: 60_000, maxRequests: 1, maxInFlight: 2 });
    expect(first.allowed).toBe(true);
    if (first.allowed) first.release();

    expect(acquireRequestSlot(key, { windowMs: 60_000, maxRequests: 1, maxInFlight: 2 }).allowed).toBe(false);
  });

  it("allows only one concurrent provider call for the same account", () => {
    const key = `request-concurrency-${Date.now()}`;
    const first = acquireRequestSlot(key, { windowMs: 60_000, maxRequests: 2, maxInFlight: 1 });
    expect(first.allowed).toBe(true);
    expect(acquireRequestSlot(key, { windowMs: 60_000, maxRequests: 2, maxInFlight: 1 }).allowed).toBe(false);

    if (first.allowed) first.release();
    expect(acquireRequestSlot(key, { windowMs: 60_000, maxRequests: 2, maxInFlight: 1 }).allowed).toBe(true);
  });
});

import { getProviderHttpError, isProviderTimeoutError } from "@/lib/provider-errors";

describe("provider error normalization", () => {
  it("recognizes timeout errors across Node fetch variants", () => {
    const namedTimeout = new Error("The operation was aborted due to timeout");
    namedTimeout.name = "TimeoutError";

    expect(isProviderTimeoutError(namedTimeout)).toBe(true);
    expect(isProviderTimeoutError(new Error("request timed out"))).toBe(true);
    expect(isProviderTimeoutError(new Error("connection refused"))).toBe(false);
  });

  it("keeps free-tier rate limits distinct from invalid credentials", () => {
    expect(getProviderHttpError("OpenRouter", 429).message).toContain("free-tier rate limit reached");
    expect(getProviderHttpError("Groq", 401).message).toContain("invalid or expired credentials");
  });

});

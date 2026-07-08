import { DEFAULT_LIVE_MODEL, DEFAULT_LIVE_PROVIDER, PROVIDERS } from "@/lib/provider-registry";

describe("provider registry", () => {
  it("uses GitHub Models as the recommended live provider", () => {
    expect(DEFAULT_LIVE_PROVIDER).toBe("github-models");
    expect(DEFAULT_LIVE_MODEL).toBe("openai/gpt-4o-mini");
    expect(PROVIDERS.map((provider) => provider.id)).toEqual([
      "mock",
      "github-models",
      "openrouter",
      "gigachat",
      "vercel-gateway",
    ]);
  });
});

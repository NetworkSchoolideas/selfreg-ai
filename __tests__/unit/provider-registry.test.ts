import {
  DEFAULT_LIVE_MODEL,
  DEFAULT_LIVE_PROVIDER,
  GIGACHAT_SESSION_MODELS,
  GROQ_FREE_CHAT_MODELS,
  getFreeChatModels,
  getReleaseProviders,
  isProviderEnabledInRelease,
  PROVIDERS,
} from "@/lib/provider-registry";

describe("provider registry", () => {
  it("uses OpenRouter as the recommended live provider and retains GitHub Models only for historical compatibility", () => {
    expect(DEFAULT_LIVE_PROVIDER).toBe("openrouter");
    expect(DEFAULT_LIVE_MODEL).toBe("openrouter/free");
    expect(PROVIDERS.map((provider) => provider.id)).toEqual([
      "mock",
      "github-models",
      "openrouter",
      "groq",
      "gigachat",
      "vercel-gateway",
    ]);
  });

  it("exposes only approved providers in the release UI", () => {
    expect(getReleaseProviders().map((provider) => provider.id)).toEqual([
      "mock",
      "openrouter",
      "groq",
      "gigachat",
    ]);
    expect(isProviderEnabledInRelease("github-models")).toBe(false);
    expect(isProviderEnabledInRelease("openrouter")).toBe(true);
    expect(isProviderEnabledInRelease("groq")).toBe(true);
    expect(isProviderEnabledInRelease("mock")).toBe(true);
    expect(isProviderEnabledInRelease("gigachat")).toBe(true);
    expect(isProviderEnabledInRelease("vercel-gateway")).toBe(false);
  });

  it("offers only approved session models for live learner responses", () => {
    expect(GROQ_FREE_CHAT_MODELS).toHaveLength(7);
    expect(GROQ_FREE_CHAT_MODELS).toContain("llama-3.3-70b-versatile");
    expect(GROQ_FREE_CHAT_MODELS).toContain("openai/gpt-oss-120b");
    expect(GROQ_FREE_CHAT_MODELS).toContain("qwen/qwen3.6-27b");
    expect(GROQ_FREE_CHAT_MODELS).not.toContain("meta-llama/llama-prompt-guard-2-22m");
    expect(GROQ_FREE_CHAT_MODELS).not.toContain("openai/gpt-oss-safeguard-20b");
    expect(GIGACHAT_SESSION_MODELS).toEqual(["GigaChat"]);
    expect(getFreeChatModels("gigachat")).toEqual(["GigaChat"]);
  });

});

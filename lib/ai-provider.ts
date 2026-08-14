import type { ProviderId } from "@/lib/provider-registry";
import type { AiProvider } from "@/lib/ai-types";

/**
 * Scenario Ownership Contract (enforced at interface level):
 * - When `input.forcedScenario` is provided, the provider **must** treat it as the final decision.
 * - The provider's only job is to generate human-sounding text that matches the given scenario.
 * - This contract is repeated in every provider's system prompt.
 */
export function getAiProvider(provider?: ProviderId): AiProvider {
  const selected = provider || "mock";

  if (selected === "gigachat") {
    const { gigachatProvider } = require("@/lib/gigachat-provider");
    return gigachatProvider;
  }

  if (selected === "openrouter") {
    const { openrouterProvider } = require("@/lib/openrouter-provider");
    return openrouterProvider;
  }

  if (selected === "groq") {
    const { groqProvider } = require("@/lib/groq-provider");
    return groqProvider;
  }

  if (selected === "github-models") {
    const { githubModelsProvider } = require("@/lib/github-models-provider");
    return githubModelsProvider;
  }

  if (selected === "vercel-gateway") {
    const { vercelGatewayProvider } = require("@/lib/vercel-gateway-provider");
    return vercelGatewayProvider;
  }

  const { mockProvider } = require("@/lib/mock-provider");
  return mockProvider;
}

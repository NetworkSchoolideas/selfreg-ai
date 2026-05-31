import { githubModelsProvider } from "@/lib/github-models-provider";
import { gigachatProvider } from "@/lib/gigachat-provider";
import { mockProvider } from "@/lib/mock-provider";
import { openrouterProvider } from "@/lib/openrouter-provider";
import { vercelGatewayProvider } from "@/lib/vercel-gateway-provider";
import type { ProviderId } from "@/lib/provider-registry";
import type { Scenario } from "@/lib/selfreg-model";
import type { AppLang } from "@/lib/app-i18n";
import { ai } from "@/lib/config";

export type AnalyzeInput = {
  userId: string;
  answer: string;
  currentStage: string;
  context?: string;
  provider?: ProviderId;
  model?: string;
  userApiKey?: string;
  lang?: AppLang;
  history: Array<{ stage: string; answer: string; feedback?: string }>;
  nonAcademicContext?: boolean;
  /**
   * ABSOLUTE: This value comes from scenario-engine via the route.
   * Every provider MUST respect it and MUST NOT attempt to choose or override A/B/clarify.
   * If present, it has the highest priority in both the system prompt and any internal logic.
   */
  forcedScenario?: Scenario;
};

export type AnalyzeResult = {
  nextStage: string;
  scenario: Scenario;   // widened to support "skipped" (client-side marker)
  feedback: string;
  dashboardNote?: string;
  responseMode?: "mock" | "llm-json" | "llm-text" | "llm-fallback";
};

export type AiProvider = {
  analyze(input: AnalyzeInput): Promise<AnalyzeResult>;
};

/**
 * Scenario Ownership Contract (enforced at interface level):
 * - When `input.forcedScenario` is provided, the provider **must** treat it as the final decision.
 * - The provider's only job is to generate human-sounding text that matches the given scenario.
 * - This contract is repeated in every provider's system prompt.
 */
export function getAiProvider(provider?: ProviderId): AiProvider {
  const selected = provider || ai.defaultProvider || "mock";
  if (selected === "gigachat") return gigachatProvider;
  if (selected === "openrouter") return openrouterProvider;
  if (selected === "github-models") return githubModelsProvider;
  if (selected === "vercel-gateway") return vercelGatewayProvider;
  return mockProvider;
}

import { type AnalyzeInput, type AnalyzeResult } from "@/lib/ai-types";
import { buildAnalyzeResultFromLlm } from "@/lib/llm-response";
import { getNextStage, type StageId } from "@/lib/selfreg-model";
import { providers } from "@/lib/config";
import { getGigaChatAccessToken } from "@/lib/gigachat-token";
import { requestGigaChatJson } from "@/lib/gigachat-http";
import { getProviderHttpError } from "@/lib/provider-errors";
import { buildSelfRegPromptPayload, buildSelfRegSystemPrompt } from "@/lib/selfreg-prompt";

/**
 * GigaChat Provider with User Key Support
 *
 * Supported individual-freemium provider. Supports both:
 * - Server-side credentials (GIGACHAT_CREDENTIALS env var)
 * - User-provided Authorization Key (sessionStorage by default; localStorage
 *   only after explicit opt-in)
 *
 * User key takes precedence if provided.
 */

const API_URL = "https://api.giga.chat/v1/chat/completions";

async function getAccessToken(userKey?: string): Promise<string> {
  // Priority 1: User-provided key (from localStorage)
  if (userKey) {
    return await getGigaChatAccessToken(userKey, providers.gigachat.scope(), providers.gigachat.authUrl());
  }

  // Priority 2: Server-side credentials (fallback)
  const credentials = providers.gigachat.credentials();
  if (credentials) {
    return await getGigaChatAccessToken(credentials, providers.gigachat.scope(), providers.gigachat.authUrl());
  }

  throw new Error(
    "GigaChat Authorization Key required. Please configure in settings."
  );
}

function buildPrompt(input: AnalyzeInput, expectedNextStage: StageId) {
  return [
    buildSelfRegSystemPrompt(input, expectedNextStage),
    JSON.stringify(buildSelfRegPromptPayload(input, expectedNextStage), null, 2)
  ].join("\n\n");
}

export function getGigaChatCompletionContent(payload: unknown): string {
  const content = (payload as { choices?: Array<{ message?: { content?: unknown } }> })
    .choices?.[0]?.message?.content;
  if (typeof content === "string" && content.trim()) return content;
  throw new Error("GigaChat returned no usable completion");
}

export const gigachatProvider = {
  async analyze(input: AnalyzeInput): Promise<AnalyzeResult> {
    const expectedNextStage = getNextStage(input.currentStage as StageId);
    const accessToken = await getAccessToken(input.userApiKey);

    const response = await requestGigaChatJson<{
      choices?: Array<{ message?: { content?: unknown } }>;
    }>(providers.gigachat.apiUrl() || API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        model: providers.gigachat.model(input.model),
        messages: [{ role: "user", content: buildPrompt(input, expectedNextStage) }],
        temperature: 0.3,
        max_tokens: 350
      }),
      timeoutMs: 20_000,
    });

    if (!response.ok) throw getProviderHttpError("GigaChat", response.status);
    const content = getGigaChatCompletionContent(response.data);

    return buildAnalyzeResultFromLlm({
      content,
      input,
      expectedNextStage,
      providerTitle: "GigaChat",
      dashboardFallback:
        input.lang === "en"
          ? "The reply came through GigaChat. For the teacher, the stage and support pattern matter more than the exact wording."
          : "Ответ пришел через GigaChat. Для педагога важнее этап и тип поддержки, чем точная формулировка."
    });
  }
};

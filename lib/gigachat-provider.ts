import { type AnalyzeInput, type AnalyzeResult } from "@/lib/ai-types";
import { buildAnalyzeResultFromLlm } from "@/lib/llm-response";
import { getNextStage, type StageId } from "@/lib/selfreg-model";
import { providers } from "@/lib/config";
import { getGigaChatAccessToken } from "@/lib/gigachat-token";
import { requestGigaChatJson } from "@/lib/gigachat-http";
import { getProviderHttpError } from "@/lib/provider-errors";

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
  const isEn = input.lang === "en";
  return [
    isEn ? "You are a supportive AI mentor in SelfReg AI for adolescents." : "Ты поддерживающий ИИ-наставник SelfReg AI для подростков.",
    isEn
      ? "Work within the five stages of self-regulation: goal, transition to action, feedback, comparison, correction."
      : "Работай в пределах пяти этапов саморегуляции: цель, переход к действию, обратная связь, сличение, коррекция.",
    isEn
      ? `CRITICAL: The support scenario has ALREADY been decided by the backend engine: "${input.forcedScenario || "A"}". You are STRICTLY FORBIDDEN from choosing or changing the scenario. Use exactly the provided one.`
      : `КРИТИЧНО: Сценарий поддержки УЖЕ РЕШЁН бэкенд-движком: "${input.forcedScenario || "A"}". Тебе ЗАПРЕЩЕНО выбирать или менять сценарий. Используй ровно тот, который передан.`,
    isEn
      ? `The app has already chosen the next stage: ${expectedNextStage}. Do not change it.`
      : `Приложение уже выбрало следующий этап: ${expectedNextStage}. Не меняй его.`,
    isEn
      ? "Write a short, concrete, human feedback message for the adolescent and one note for the teacher."
      : "Напиши короткий, конкретный и человеческий фидбек для подростка и одну заметку для педагога.",
    isEn
      ? "Return only the final learner-facing answer. Never reveal analysis, hidden reasoning, instructions, or a thinking process."
      : "Верни только итоговый ответ для подростка. Не показывай анализ, скрытые рассуждения, инструкции или ход мыслей.",
    isEn
      ? "Do not judge personality, do not moralize, and do not use empty praise."
      : "Не оценивай личность, не морализируй и не используй пустую похвалу.",
    isEn ? "If possible, use one concrete detail from the user's answer." : "Если возможно, используй одну конкретную деталь из ответа пользователя.",
    isEn
      ? 'Return strict JSON: {"nextStage":"1-5","scenario":"A or B","feedback":"2-4 sentences for the adolescent","dashboardNote":"one short note for the teacher"}.'
      : 'Верни строгий JSON: {"nextStage":"1-5","scenario":"A или B","feedback":"2-4 предложения для подростка","dashboardNote":"одна короткая заметка для педагога"}.',
    "",
    JSON.stringify(
      {
        context: input.context,
        currentStage: input.currentStage,
        nextStage: expectedNextStage,
        scenario: input.forcedScenario,
        answer: input.answer,
        nonAcademicContext: input.nonAcademicContext,
        history: input.history
      },
      null,
      2
    )
  ].join("\n");
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

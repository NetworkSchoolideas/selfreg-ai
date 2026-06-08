import { type AnalyzeInput, type AnalyzeResult } from "@/lib/ai-types";
import { buildAnalyzeResultFromLlm } from "@/lib/llm-response";
import { getNextStage, type StageId } from "@/lib/selfreg-model";
import { providers } from "@/lib/config";
import { getGigaChatAccessToken, clearGigaChatToken } from "@/lib/gigachat-token";

/**
 * GigaChat Provider with User Key Support
 *
 * Status: Maintained as a showcase / витрина.
 * Supports both:
 * - Server-side credentials (GIGACHAT_CREDENTIALS env var)
 * - User-provided Authorization Key (stored in localStorage)
 *
 * User key takes precedence if provided.
 */

const AUTH_URL = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth";
const API_URL = "https://gigachat.devices.sberbank.ru/api/v1/chat/completions";

async function getAccessToken(userKey?: string): Promise<string> {
  // Priority 1: User-provided key (from localStorage)
  if (userKey) {
    console.log('[GigaChat] Using user-provided authorization key');
    return await getGigaChatAccessToken(userKey);
  }

  // Priority 2: Server-side credentials (fallback)
  const credentials = providers.gigachat.credentials();
  if (credentials) {
    console.log('[GigaChat] Using server-side credentials');
    return await getGigaChatAccessToken(credentials);
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

export const gigachatProvider = {
  async analyze(input: AnalyzeInput): Promise<AnalyzeResult> {
    const expectedNextStage = getNextStage(input.currentStage as StageId);
    const accessToken = await getAccessToken(input.userApiKey);

    const response = await fetch(providers.gigachat.apiUrl() || API_URL, {
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
      })
    });

    if (!response.ok) throw new Error(`GigaChat completion: ${response.status}`);
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";

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

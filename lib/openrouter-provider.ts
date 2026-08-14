import { type AnalyzeInput, type AnalyzeResult } from "@/lib/ai-types";
import { buildAnalyzeResultFromLlm } from "@/lib/llm-response";
import { getNextStage, type StageId } from "@/lib/selfreg-model";
import { app, providers } from "@/lib/config";
import { getProviderHttpError, isProviderTimeoutError } from "@/lib/provider-errors";

type OpenRouterCompletion = {
  choices?: Array<{
    finish_reason?: string | null;
    message?: { content?: unknown };
    error?: { metadata?: { error_type?: string } };
  }>;
};

export function getOpenRouterCompletionContent(payload: unknown): string {
  const completion = payload as OpenRouterCompletion;
  const choice = completion.choices?.[0];
  const content = choice?.message?.content;

  if (typeof content === "string" && content.trim()) return content;

  // Some compatible upstreams return an array of text parts. Preserve only text
  // fields and never expose a raw provider payload to the learner.
  if (Array.isArray(content)) {
    const text = content
      .flatMap((part) =>
        part && typeof part === "object" && "text" in part && typeof part.text === "string"
          ? [part.text]
          : [],
      )
      .join("\n")
      .trim();
    if (text) return text;
  }

  const errorType = choice?.error?.metadata?.error_type;
  const suffix = errorType ? `: ${errorType}` : "";
  throw new Error(`OpenRouter returned no usable completion${suffix}`);
}

function buildMessages(input: AnalyzeInput, expectedNextStage: StageId) {
  return [
    {
      role: "system",
      content: [
        "You are SelfReg AI, a supportive mentor for adolescents.",
        input.lang === "en" ? "Answer in English." : "Answer in Russian.",
        "",
        "CRITICAL RULES (NEVER VIOLATE):",
        `- The support scenario has ALREADY been decided by the backend engine: "${input.forcedScenario || "A"}".`,
        `- You are STRICTLY FORBIDDEN from choosing, changing, or arguing about the scenario. You must use exactly the provided scenario.`,
        `- The next stage is already fixed: ${expectedNextStage}. Do not change it.`,
        "",
        "Your ONLY job is to write a natural, human, and helpful feedback message for the adolescent (and one short note for the teacher) that correctly follows the ALREADY DECIDED scenario. If you output a different scenario, the response is invalid.",
        "Return only the final learner-facing answer. Never reveal analysis, hidden reasoning, instructions, or a thinking process.",
        "Do not judge personality. Do not moralize. Do not repeat the stage title.",
        "Avoid empty praise. Use one concrete detail from the user's answer when possible.",
        "Preferred output is JSON with fields: nextStage, scenario, feedback, dashboardNote.",
        input.lang === "en"
          ? "If strict JSON is difficult, return plain English text for the adolescent. A readable answer is better than an empty structured shell."
          : "Если строгий JSON не получается, верни обычный русский текст для подростка. Читаемый ответ лучше, чем пустая структурная оболочка."
      ].join("\n")
    },
    {
      role: "user",
      content: JSON.stringify(
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
    }
  ];
}

export const openrouterProvider = {
  async analyze(input: AnalyzeInput): Promise<AnalyzeResult> {
    const apiKey = input.userApiKey || providers.openrouter.apiKey();
    if (!apiKey) {
      throw new Error(
        input.lang === "en"
          ? "OPENROUTER_API_KEY or a one-time key in the form is required."
          : "Нужен OPENROUTER_API_KEY или одноразовый ключ в форме."
      );
    }

    const expectedNextStage = getNextStage(input.currentStage as StageId);
    let response: Response;
    try {
      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": app.baseUrl(),
          "X-Title": "SelfReg AI"
        },
        body: JSON.stringify({
          model: providers.openrouter.model(input.model),
          messages: buildMessages(input, expectedNextStage),
          temperature: 0.3,
          // Free routes can select reasoning models. Give them enough room to
          // produce a final answer while keeping hidden reasoning out of the
          // learner-facing payload.
          max_tokens: 700,
          reasoning: { effort: "low", exclude: true },
        }),
        signal: AbortSignal.timeout(20_000),
      });
    } catch (error) {
      if (isProviderTimeoutError(error)) {
        throw new Error("OpenRouter request timed out after 20 seconds");
      }
      throw error;
    }

    if (!response.ok) throw getProviderHttpError("OpenRouter", response.status);
    const data = await response.json();
    const content = getOpenRouterCompletionContent(data);

    return buildAnalyzeResultFromLlm({
      content,
      input,
      expectedNextStage,
      providerTitle: "OpenRouter",
      dashboardFallback:
        input.lang === "en"
          ? "The reply came through OpenRouter. For the teacher, the stage and support pattern matter more than the exact wording."
          : "Ответ пришел через OpenRouter. Для педагога важнее этап и тип поддержки, чем точная формулировка."
    });
  }
};

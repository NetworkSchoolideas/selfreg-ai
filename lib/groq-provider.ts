import { type AnalyzeInput, type AnalyzeResult } from "@/lib/ai-types";
import { buildAnalyzeResultFromLlm } from "@/lib/llm-response";
import { getNextStage, type StageId } from "@/lib/selfreg-model";
import { providers } from "@/lib/config";
import { getProviderHttpError, isProviderTimeoutError } from "@/lib/provider-errors";
import { buildSelfRegPromptPayload, buildSelfRegSystemPrompt } from "@/lib/selfreg-prompt";

type GroqCompletion = {
  choices?: Array<{ message?: { content?: unknown } }>;
};

export function getGroqModelRequestOptions(model: string) {
  if (model === "qwen/qwen3.6-27b") {
    return { reasoning_effort: "none", reasoning_format: "hidden" };
  }

  if (model === "openai/gpt-oss-20b" || model === "openai/gpt-oss-120b") {
    return { reasoning_effort: "low", reasoning_format: "hidden" };
  }

  return {};
}

export function getGroqCompletionContent(payload: unknown): string {
  const content = (payload as GroqCompletion).choices?.[0]?.message?.content;
  if (typeof content === "string" && content.trim()) return content;
  throw new Error("Groq returned no usable completion");
}

function buildMessages(input: AnalyzeInput, expectedNextStage: StageId) {
  return [
    {
      role: "system",
      content: buildSelfRegSystemPrompt(input, expectedNextStage),
    },
    {
      role: "user",
      content: JSON.stringify(buildSelfRegPromptPayload(input, expectedNextStage)),
    },
  ];
}

export const groqProvider = {
  async analyze(input: AnalyzeInput): Promise<AnalyzeResult> {
    const apiKey = input.userApiKey || providers.groq.apiKey();
    if (!apiKey) throw new Error("GROQ_API_KEY or a one-time key in the form is required.");

    const expectedNextStage = getNextStage(input.currentStage as StageId);
    const model = providers.groq.model(input.model);
    let response: Response;
    try {
      response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: buildMessages(input, expectedNextStage),
          temperature: 0.3,
          max_tokens: 350,
          ...getGroqModelRequestOptions(model),
        }),
        signal: AbortSignal.timeout(20_000),
      });
    } catch (error) {
      if (isProviderTimeoutError(error)) {
        throw new Error("Groq request timed out after 20 seconds");
      }
      throw error;
    }

    if (!response.ok) throw getProviderHttpError("Groq", response.status);
    const content = getGroqCompletionContent(await response.json());

    return buildAnalyzeResultFromLlm({
      content,
      input,
      expectedNextStage,
      providerTitle: "Groq",
      dashboardFallback:
        input.lang === "en"
          ? "The reply came through Groq; the teacher should focus on the stage and support pattern."
          : "Ответ пришёл через Groq; педагогу важнее этап и тип поддержки.",
    });
  },
};

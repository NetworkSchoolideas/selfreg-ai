import { type AnalyzeInput, type AnalyzeResult } from "@/lib/ai-provider";
import { buildAnalyzeResultFromLlm } from "@/lib/llm-response";
import { getNextStage, type StageId } from "@/lib/selfreg-model";
import { providers } from "@/lib/config";

const API_URL = "https://models.github.ai/inference/chat/completions";

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

export const githubModelsProvider = {
  async analyze(input: AnalyzeInput): Promise<AnalyzeResult> {
    const apiKey = input.userApiKey || providers.github.token();
    if (!apiKey) {
      throw new Error(
        input.lang === "en"
          ? "A GitHub token with models scope is required."
          : "Нужен GitHub token с правом models."
      );
    }

    const expectedNextStage = getNextStage(input.currentStage as StageId);
    const response = await fetch(providers.github.apiUrl() || API_URL, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${apiKey}`,
        "X-GitHub-Api-Version": providers.github.apiVersion() || "2022-11-28",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: providers.github.model(input.model),
        messages: buildMessages(input, expectedNextStage),
        temperature: 0.3,
        max_tokens: 350
      })
    });

    if (!response.ok) throw new Error(`GitHub Models: ${response.status}`);
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";

    return buildAnalyzeResultFromLlm({
      content,
      input,
      expectedNextStage,
      providerTitle: "GitHub Models",
      dashboardFallback:
        input.lang === "en"
          ? "The reply came through GitHub Models. For the teacher, the stage and support pattern matter more than the exact wording."
          : "Ответ пришел через GitHub Models. Для педагога важнее этап и тип поддержки, чем точная формулировка."
    });
  }
};

import { type AnalyzeInput, type AnalyzeResult } from "@/lib/ai-provider";
import { buildAnalyzeResultFromLlm } from "@/lib/llm-response";
import { getNextStage, type StageId } from "@/lib/selfreg-model";
import { providers } from "@/lib/config";

export const vercelGatewayProvider = {
  async analyze(input: AnalyzeInput): Promise<AnalyzeResult> {
    const apiKey = input.userApiKey || providers.vercelGateway.apiKey();
    if (!apiKey) {
      throw new Error(
        input.lang === "en"
          ? "AI_GATEWAY_API_KEY or a one-time key in the form is required."
          : "Нужен AI_GATEWAY_API_KEY или одноразовый ключ в форме."
      );
    }

    const expectedNextStage = getNextStage(input.currentStage as StageId);
    const response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: providers.vercelGateway.model(input.model),
        messages: [
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
              "Return strict JSON with fields: nextStage, scenario, feedback, dashboardNote."
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
        ],
        response_format: { type: "json" },
        stream: false,
        temperature: 0.3,
        max_tokens: 350
      })
    });

    if (!response.ok) throw new Error(`Vercel AI Gateway: ${response.status}`);
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";

    return buildAnalyzeResultFromLlm({
      content,
      input,
      expectedNextStage,
      providerTitle: "Vercel AI Gateway",
      dashboardFallback: "Ответ получен через Vercel AI Gateway. Для педагога важнее этап и тип поддержки, чем общий тон формулировки."
    });
  }
};

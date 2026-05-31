import { type AnalyzeInput, type AnalyzeResult } from "@/lib/ai-provider";
import { getNextStage, makeMockFeedback, type StageId } from "@/lib/selfreg-model";

export const mockProvider = {
  async analyze(input: AnalyzeInput): Promise<AnalyzeResult> {
    // IMPORTANT: always forward forcedScenario from the engine (route.ts).
    // This closes the last active path where legacy detectScenario could still run.
    const result = makeMockFeedback({
      stageId: input.currentStage as StageId,
      answer: input.answer,
      context: input.context || "",
      history: input.history,
      lang: input.lang,
      forcedScenario: input.forcedScenario
    });

    // "skipped" is only created client-side on explicit "Пропустить этот шаг".
    // The mock (and all providers) must return a valid AI-decided scenario.
    const providerScenario = result.scenario === "skipped" ? "clarify" : result.scenario;

    return {
      nextStage: getNextStage(input.currentStage as StageId),
      scenario: providerScenario,
      feedback: result.feedback,
      dashboardNote:
        input.lang === "en"
          ? "Mock mode: the stage logic works without an external API. To test live output, choose GigaChat, OpenRouter, or Vercel AI Gateway."
          : "Mock-режим: логика этапов работает без внешнего API. Чтобы проверить живой ответ, выбери GigaChat, OpenRouter или Vercel AI Gateway.",
      responseMode: "mock"
    };
  }
};

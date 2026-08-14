import { buildAnalyzeResultFromLlm } from "@/lib/llm-response";

const input = {
  userId: "student-1",
  answer: "Я застрял и не знаю, с чего начать.",
  currentStage: "2",
  context: "учебный проект",
  lang: "ru" as const,
  history: [],
  forcedScenario: "B" as const,
};

describe("LLM response normalization", () => {
  it("never exposes a model thinking process as learner feedback", () => {
    const result = buildAnalyzeResultFromLlm({
      content: "Here's a thinking process: 1. Analyze the Request. I must answer in Russian.",
      input,
      expectedNextStage: "3",
      providerTitle: "Test provider",
      dashboardFallback: "Fallback note",
    });

    expect(result.responseMode).toBe("llm-fallback");
    expect(result.feedback).not.toContain("thinking process");
    expect(result.scenario).toBe("B");
  });
});

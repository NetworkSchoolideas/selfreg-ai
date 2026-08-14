import { buildSelfRegPromptPayload, buildSelfRegSystemPrompt } from "@/lib/selfreg-prompt";

const input = {
  userId: "student-1",
  answer: "I keep postponing the first step.",
  currentStage: "2",
  context: "group project",
  lang: "en" as const,
  history: [],
  forcedScenario: "B" as const,
};

describe("SelfReg live-response contract", () => {
  it("keeps language, stage ownership, a concrete action, and non-clinical boundaries together", () => {
    const prompt = buildSelfRegSystemPrompt(input, "3");

    expect(prompt).toContain("English");
    expect(prompt).toContain('scenario as "B"');
    expect(prompt).toContain('next stage as "3"');
    expect(prompt).toContain("one doable next action");
    expect(prompt).toContain("Do not diagnose");
    expect(prompt).toContain("strict JSON");
  });

  it("keeps learner content separate from the provider-independent instructions", () => {
    expect(buildSelfRegPromptPayload(input, "3")).toMatchObject({
      answer: "I keep postponing the first step.",
      nextStage: "3",
      scenario: "B",
    });
  });
});

import {
  getNextStage,
  getStageMeta,
  getStageOrder,
  getStageQuestion,
  makeMockFeedback,
  type Scenario,
  type StageId,
} from "@/lib/selfreg-model";

const stageIds = getStageOrder();
const langs = ["ru", "en"] as const;

describe("self-regulation model", () => {
  it("returns complete stage metadata for all stages and languages", () => {
    expect(stageIds).toEqual(["1", "2", "3", "4", "5"]);

    for (const stageId of stageIds) {
      for (const lang of langs) {
        const meta = getStageMeta(stageId, lang);

        expect(meta.id).toBe(stageId);
        expect(meta.title.trim()).not.toHaveLength(0);
        expect(meta.shortTitle.trim()).not.toHaveLength(0);
        expect(meta.teenDescription.trim()).not.toHaveLength(0);
        expect(meta.teacherSignal.trim()).not.toHaveLength(0);
        expect(meta.questions.length).toBeGreaterThan(0);
        expect(meta.questions.every((question) => question.trim().length > 0)).toBe(true);
      }
    }
  });

  it("cycles through stages in order", () => {
    expect(getNextStage("1")).toBe("2");
    expect(getNextStage("2")).toBe("3");
    expect(getNextStage("3")).toBe("4");
    expect(getNextStage("4")).toBe("5");
    expect(getNextStage("5")).toBe("1");
  });

  it("returns a question for every stage and language", () => {
    for (const stageId of stageIds) {
      for (const lang of langs) {
        expect(getStageQuestion(stageId, "", [], lang).trim()).not.toHaveLength(0);
      }
    }
  });

  it("builds mock feedback for supported scenarios", () => {
    const scenarios: Scenario[] = ["A", "B", "clarify"];

    for (const scenario of scenarios) {
      for (const lang of langs) {
        const result = makeMockFeedback({
          stageId: "1" as StageId,
          answer: "I want to prepare calmly.",
          context: "exam preparation",
          history: [],
          lang,
          forcedScenario: scenario,
        });

        expect(result.scenario).toBe(scenario);
        expect(result.feedback.trim()).not.toHaveLength(0);
        expect(result.finalNote.trim()).not.toHaveLength(0);
      }
    }
  });
});

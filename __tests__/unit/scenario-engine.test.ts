import {
  decideSupportScenario,
  decideSupportScenarioDetailed,
  detectScenarioHeuristically,
  EN_CLARIFY,
  RU_CLARIFY,
} from "@/lib/scenario-engine";

describe("scenario engine", () => {
  it("detects scenario A for a concrete conscious answer", () => {
    const result = detectScenarioHeuristically(
      "I want to improve my math exam preparation by solving five tasks every day.",
      "",
      [],
      "en",
      undefined,
      "1"
    );

    expect(result.scenario).toBe("A");
    expect(result.reason).toEqual(expect.any(String));
    expect(result.signals.length).toBeGreaterThan(0);
  });

  it("detects scenario B for real Russian pressure and self-attack wording", () => {
    expect(
      detectScenarioHeuristically(
        "Я должен получить только пятерку любой ценой, иначе я ничтожество",
        "",
        [],
        "ru",
        undefined,
        "1"
      ).scenario
    ).toBe("B");
  });

  it("detects clarify for real Russian confusion wording", () => {
    expect(decideSupportScenario("не понял вопрос", "", [], "ru", undefined, "1")).toBe("clarify");
  });

  it("returns detailed decision metadata", () => {
    const result = decideSupportScenarioDetailed(
      "I need one calm first step for my project.",
      "",
      [{ stage: "1", answer: "Project deadline", scenario: "A" }],
      "en",
      undefined,
      "2"
    );

    expect(result.scenario).toBe("A");
    expect(result.reason).toEqual(expect.any(String));
    expect(result.signals).toEqual(expect.any(Array));
    expect(result.historySummary).toContain("records=1");
  });

  it("exports clarify markers for Russian and English phrases", () => {
    expect(RU_CLARIFY).toContain("не понял");
    expect(EN_CLARIFY).toContain("don't understand");
  });
});

import { detectSafetyRisk } from "@/lib/safety-guard";

describe("safety guard", () => {
  it.each([
    ["I want to hurt myself", "self_harm"],
    ["Someone is threatening me right now", "immediate_danger"],
    ["I will kill them", "violence_threat"],
  ] as const)("blocks %s", (answer, category) => {
    expect(detectSafetyRisk({ answer, lang: "en" })).toMatchObject({ blocked: true, category });
  });

  it("allows an ordinary self-regulation answer", () => {
    expect(
      detectSafetyRisk({ answer: "I will prepare for my math exam by solving three tasks.", lang: "en" })
    ).toBeNull();
  });
});

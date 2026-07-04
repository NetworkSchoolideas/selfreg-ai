import { AnswerValidator } from "@/lib/answer-validator";

describe("AnswerValidator", () => {
  it("rejects an empty answer", () => {
    expect(AnswerValidator.validateAnswer("", "en")).toEqual({
      ok: false,
      message: "Please write an answer.",
    });
  });

  it("rejects a one-character answer as too short", () => {
    expect(AnswerValidator.validateAnswer("a", "en").ok).toBe(false);
  });

  it("accepts a meaningful long answer", () => {
    const answer = "I want to prepare for the exam by solving practice tasks calmly every day. ".repeat(15);

    expect(answer.length).toBeGreaterThan(1000);
    expect(AnswerValidator.validateAnswer(answer, "en")).toEqual({ ok: true });
  });
});

import { buildSessionSummary } from "@/lib/session-summary";
import type { RecordItem } from "@/types/session";

const clarificationRecord: RecordItem = {
  stageId: "1",
  stageTitle: "Цель",
  scenario: "clarify",
  eventType: "clarify_request",
  answer: "Вопрос был непонятен.",
  feedback: "Нужна более понятная формулировка.",
  timestamp: "2026-07-16T00:00:00.000Z",
};

describe("buildSessionSummary", () => {
  it("uses the Russian genitive form when describing the move from a goal to action", () => {
    expect(buildSessionSummary("учебный проект", [clarificationRecord], "ru")).toContain("от цели к действию");
  });
});

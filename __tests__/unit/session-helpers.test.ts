import {
  countProgressStages,
  createRecord,
  formatProgressStageCount,
  getNextStageInfo,
  isSessionComplete,
} from "@/lib/session-helpers";
import type { RecordItem } from "@/types/session";

function answerRecord(stageId: RecordItem["stageId"]): RecordItem {
  return {
    stageId,
    stageTitle: `Stage ${stageId}`,
    scenario: "A",
    eventType: "answer",
    answer: "answer",
    feedback: "feedback",
    question: "question",
    timestamp: `2026-01-0${stageId}T00:00:00.000Z`,
  };
}

describe("session helpers", () => {
  it("creates a record with a derived event type", () => {
    const record = createRecord({
      stageId: "1",
      stageTitle: "Goal",
      scenario: "clarify",
      answer: "not sure",
      feedback: "please clarify",
      question: "What matters?",
      lang: "en",
    });

    expect(record).toMatchObject({
      stageId: "1",
      stageTitle: "Goal",
      scenario: "clarify",
      eventType: "clarify_request",
      answer: "not sure",
      feedback: "please clarify",
      question: "What matters?",
    });
    expect(new Date(record.timestamp).toString()).not.toBe("Invalid Date");
  });

  it("requires progress on all stages before a session is complete", () => {
    expect(isSessionComplete(["1", "2", "3", "4", "5"].map((stageId) => answerRecord(stageId as RecordItem["stageId"])), 5)).toBe(true);
    expect(isSessionComplete(["1", "2", "3"].map((stageId) => answerRecord(stageId as RecordItem["stageId"])), 5)).toBe(false);
  });

  it("counts completed stages without inflating clarification and retry events", () => {
    const stageOne = answerRecord("1");
    const clarification: RecordItem = {
      ...answerRecord("2"),
      scenario: "clarify",
      eventType: "clarify_request",
    };
    const retry = {
      ...answerRecord("2"),
      eventType: "retry" as const,
    };

    expect(countProgressStages([stageOne, clarification, retry, answerRecord("2")])).toBe(2);
  });

  it("formats the stage count with a locale-aware label", () => {
    expect(formatProgressStageCount(1, "en")).toBe("1 step");
    expect(formatProgressStageCount(2, "en")).toBe("2 steps");
    expect(formatProgressStageCount(1, "ru")).toBe("1 шаг");
    expect(formatProgressStageCount(2, "ru")).toBe("2 шага");
    expect(formatProgressStageCount(5, "ru")).toBe("5 шагов");
    expect(formatProgressStageCount(11, "ru")).toBe("11 шагов");
    expect(formatProgressStageCount(21, "ru")).toBe("21 шаг");
  });

  it("returns the next stage metadata and question", () => {
    const result = getNextStageInfo({
      currentStageId: "1",
      context: "exam",
      records: [],
      lang: "en",
    });

    expect(result.nextStageId).toBe("2");
    expect(result.nextQuestion.trim()).not.toHaveLength(0);
    expect(result.nextStageMeta.id).toBe("2");
  });
});

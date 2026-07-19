import type { Session } from "@/types/session";
import { mergeSessionSyncRecords, toSessionSyncUpsertPayload } from "@/lib/session-sync";

describe("session sync payload helper", () => {
  it("flattens session state into the API payload shape", () => {
    const session: Session = {
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
      context: "Проверка синхронизации",
      finalNote: "Итог",
      updatedAt: "2026-01-01T10:00:00.000Z",
      lang: "ru",
      historyInsight: "История",
      adolescentFeedback: {
        rating: 5,
        comment: "Полезно",
        timestamp: "2026-01-01T10:00:00.000Z",
      },
      records: [
        {
          stageId: "1",
          stageTitle: "Цель",
          scenario: "A",
          eventType: "retry",
          provider: "mock",
          model: "local-mock",
          responseMode: "mock",
          answer: "Ответ",
          feedback: "Фидбек",
          question: "Вопрос",
          timestamp: "2026-01-01T09:59:00.000Z",
        },
      ],
    };

    expect(toSessionSyncUpsertPayload("child-1", session)).toEqual({
      action: "upsert",
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
      childId: "child-1",
      context: "Проверка синхронизации",
      finalNote: "Итог",
      updatedAt: "2026-01-01T10:00:00.000Z",
      lang: "ru",
      historyInsight: "История",
      adolescentFeedback: {
        rating: 5,
        comment: "Полезно",
        timestamp: "2026-01-01T10:00:00.000Z",
      },
      records: [
        {
          stageId: "1",
          stageTitle: "Цель",
          scenario: "A",
          eventType: "answer",
          provider: "mock",
          model: "local-mock",
          responseMode: "mock",
          answer: "Ответ",
          feedback: "Фидбек",
          question: "Вопрос",
          timestamp: "2026-01-01T09:59:00.000Z",
        },
      ],
    });
  });

  it("keeps records saved by another tab when an older snapshot is synced", () => {
    const initialRecord = {
      stageId: "1",
      stageTitle: "Goal",
      scenario: "A",
      eventType: "answer" as const,
      answer: "Finish the outline",
      feedback: "Good start",
      question: "What is the goal?",
      timestamp: "2026-01-01T09:00:00.000Z",
    };
    const backRecord = {
      stageId: "1",
      stageTitle: "Goal",
      scenario: "A",
      eventType: "back" as const,
      answer: "",
      feedback: "",
      question: "",
      timestamp: "2026-01-01T09:01:00.000Z",
    };
    const secondStageRecord = {
      stageId: "2",
      stageTitle: "Plan",
      scenario: "A",
      eventType: "answer" as const,
      answer: "Start with sources",
      feedback: "Specific next step",
      question: "What comes next?",
      timestamp: "2026-01-01T09:02:00.000Z",
    };

    expect(mergeSessionSyncRecords(
      [initialRecord, backRecord],
      [initialRecord, secondStageRecord],
    )).toEqual([initialRecord, backRecord, secondStageRecord]);
  });
});

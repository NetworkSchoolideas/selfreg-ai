import type { RecordItem, Session } from "@/types/session";
import {
  getScenarioDistribution,
  getSessionSignals,
  getSessionStatus,
  getStageSupport,
  getTrajectoryNote,
} from "@/lib/teacher-dashboard-analytics";

function record(overrides: Partial<RecordItem>): RecordItem {
  return {
    stageId: "1",
    stageTitle: "Goal",
    scenario: "A",
    question: "Question?",
    answer: "Answer",
    feedback: "Feedback",
    timestamp: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function session(records: RecordItem[], overrides: Partial<Session> = {}): Session {
  return {
    context: "study project",
    records,
    finalNote: "",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("teacher dashboard analytics", () => {
  it("calculates scenario distribution without treating skipped records as support base", () => {
    const result = getScenarioDistribution([
      session([
        record({ scenario: "A", eventType: "answer" }),
        record({ scenario: "B", eventType: "answer" }),
        record({ scenario: "skipped", eventType: "skip" }),
        record({ scenario: "clarify", eventType: "clarify_request" }),
      ]),
    ]);

    expect(result.raw).toEqual({ a: 1, b: 1, clarify: 1, skipped: 1, total: 3 });
    expect(result.a).toBe(50);
    expect(result.b).toBe(50);
    expect(result.clarify).toBe(50);
  });

  it("groups stage support counts by event type and scenario", () => {
    const result = getStageSupport([
      session([
        record({ stageId: "1", scenario: "A", eventType: "answer" }),
        record({ stageId: "1", scenario: "B", eventType: "answer" }),
        record({ stageId: "2", scenario: "clarify", eventType: "clarify_request" }),
        record({ stageId: "2", scenario: "skipped", eventType: "skip" }),
      ]),
    ]);

    expect(result).toEqual([
      { stageId: "1", A: 1, B: 1, clarify: 0, skipped: 0 },
      { stageId: "2", A: 0, B: 0, clarify: 1, skipped: 1 },
    ]);
  });

  it("derives session signals and status consistently", () => {
    const records = [
      record({ eventType: "answer" }),
      record({ eventType: "clarify_request", scenario: "clarify" }),
      record({ eventType: "back", scenario: "clarify" }),
      record({ eventType: "retry", scenario: "B" }),
      record({ eventType: "skip", scenario: "skipped" }),
    ];
    const signals = getSessionSignals(records);

    expect(signals.clarifications).toBe(1);
    expect(signals.returns).toBe(1);
    expect(signals.retries).toBe(1);
    expect(signals.skips).toBe(1);
    expect(getSessionStatus(session([], { finalNote: "Done" }))).toBe("completed");
    expect(getTrajectoryNote(signals, "en")).toContain("Trajectory:");
  });
});

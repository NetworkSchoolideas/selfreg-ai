import {
  applyFlowEvent,
  createInitialFlowState,
  isRetryRecord,
  reduceFlowState,
} from "@/lib/selfreg-flow-machine";
import type { StageId } from "@/lib/selfreg-model";
import type { RecordEventType, RecordItem } from "@/types/session";

function makeRecord(stageId: StageId, eventType: RecordEventType, scenario: RecordItem["scenario"] = "A"): RecordItem {
  return {
    stageId,
    stageTitle: `Stage ${stageId}`,
    scenario,
    eventType,
    answer: "answer",
    feedback: "feedback",
    question: "question",
    timestamp: `2026-01-0${stageId}T00:00:00.000Z`,
  };
}

describe("self-regulation flow machine", () => {
  it("applies answer, repair, skip, and complete events", () => {
    let state = createInitialFlowState("1");

    state = applyFlowEvent(state, { type: "ANSWER", stageId: "1" });
    expect(state.progressCount).toBe(1);
    expect(state.completedStageIds.has("1")).toBe(true);
    expect(state.currentStageId).toBe("2");

    state = applyFlowEvent(state, { type: "CLARIFY_REQUEST", stageId: "2" });
    expect(state.clarifyCount).toBe(1);
    expect(state.currentStageId).toBe("2");

    state = applyFlowEvent(state, { type: "BACK", stageId: "2" });
    expect(state.backCount).toBe(1);

    state = applyFlowEvent(state, { type: "RETRY", stageId: "2" });
    expect(state.retryCount).toBe(1);

    state = applyFlowEvent(state, { type: "SKIP", stageId: "2" });
    expect(state.skipCount).toBe(1);
    expect(state.progressCount).toBe(2);
    expect(state.completedStageIds.has("2")).toBe(true);
    expect(state.currentStageId).toBe("3");

    state = applyFlowEvent(state, { type: "COMPLETE", stageId: "2" }, { initialStageId: "1" });
    expect(state.isComplete).toBe(true);
    expect(state.currentStageId).toBe("1");
  });

  it("reduces records into aggregate flow counters", () => {
    const records: RecordItem[] = [
      makeRecord("1", "clarify_request", "clarify"),
      makeRecord("1", "answer", "A"),
      makeRecord("2", "back", "clarify"),
      makeRecord("3", "skip", "skipped"),
    ];

    const state = reduceFlowState(records);

    expect(state.clarifyCount).toBe(1);
    expect(state.backCount).toBe(1);
    expect(state.retryCount).toBe(1);
    expect(state.skipCount).toBe(1);
    expect(state.progressCount).toBe(2);
    expect([...state.completedStageIds]).toEqual(["1", "3"]);
  });

  it("detects retry records after repair events on the same stage", () => {
    expect(isRetryRecord([makeRecord("1", "clarify_request", "clarify"), makeRecord("1", "answer")], 1)).toBe(true);
    expect(isRetryRecord([makeRecord("1", "clarify_request", "clarify"), makeRecord("2", "answer")], 1)).toBe(false);
    expect(isRetryRecord([makeRecord("1", "answer"), makeRecord("1", "answer")], 1)).toBe(false);
  });
});

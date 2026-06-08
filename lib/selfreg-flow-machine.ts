import type { RecordEventType, RecordItem } from "@/types/session";
import type { StageId } from "@/lib/selfreg-model";
import { getNextStage } from "@/lib/selfreg-model";

export type SelfRegFlowEvent =
  | { type: "ANSWER"; stageId: StageId }
  | { type: "CLARIFY_REQUEST"; stageId: StageId }
  | { type: "BACK"; stageId: StageId }
  | { type: "RETRY"; stageId: StageId }
  | { type: "SKIP"; stageId: StageId }
  | { type: "COMPLETE"; stageId: StageId };

export interface SelfRegFlowState {
  currentStageId: StageId;
  completedStageIds: Set<StageId>;
  progressCount: number;
  clarifyCount: number;
  backCount: number;
  retryCount: number;
  skipCount: number;
  isComplete: boolean;
  lastEvent?: SelfRegFlowEvent;
}

export interface SerializableSelfRegFlowState {
  currentStageId: StageId;
  completedStageIds: StageId[];
  progressCount: number;
  clarifyCount: number;
  backCount: number;
  retryCount: number;
  skipCount: number;
  isComplete: boolean;
  lastEventType?: SelfRegFlowEvent["type"];
}

export const FLOW_EVENT_TYPES = ["ANSWER", "CLARIFY_REQUEST", "BACK", "RETRY", "SKIP", "COMPLETE"] as const;
export type FlowEventType = (typeof FLOW_EVENT_TYPES)[number];
export type StageFlowEventType = Exclude<FlowEventType, "COMPLETE">;

const STAGE_ORDER: StageId[] = ["1", "2", "3", "4", "5"];

export const FLOW_STAGE_TRANSITIONS: Record<StageId, Record<StageFlowEventType, StageId>> = {
  "1": { ANSWER: "2", CLARIFY_REQUEST: "1", BACK: "1", RETRY: "1", SKIP: "2" },
  "2": { ANSWER: "3", CLARIFY_REQUEST: "2", BACK: "2", RETRY: "2", SKIP: "3" },
  "3": { ANSWER: "4", CLARIFY_REQUEST: "3", BACK: "3", RETRY: "3", SKIP: "4" },
  "4": { ANSWER: "5", CLARIFY_REQUEST: "4", BACK: "4", RETRY: "4", SKIP: "5" },
  "5": { ANSWER: "1", CLARIFY_REQUEST: "5", BACK: "5", RETRY: "5", SKIP: "1" },
};

export function getNextStageForEvent(stageId: StageId, eventType: StageFlowEventType): StageId {
  const mapped = FLOW_STAGE_TRANSITIONS[stageId]?.[eventType];
  if (mapped) return mapped;
  if (eventType === "ANSWER" || eventType === "SKIP") return getNextStage(stageId);
  return stageId;
}

export function inferEventTypeFromRecord(record: RecordItem): RecordEventType {
  if (record.eventType) return record.eventType;
  if (record.scenario === "skipped") return "skip";
  if (record.scenario !== "clarify") return "answer";
  const normalized = (String(record.answer || "") + " " + String(record.feedback || "")).toLowerCase();
  if (
    normalized.includes("returned to revise") ||
    normalized.includes("returned to the previous question") ||
    normalized.includes("вернулся к предыдущему вопросу") ||
    normalized.includes("вернулась к предыдущему вопросу")
  ) {
    return "back";
  }
  return "clarify_request";
}

export function recordToFlowEvent(record: RecordItem): Extract<SelfRegFlowEvent, { type: StageFlowEventType }> {
  const eventType = inferEventTypeFromRecord(record);

  switch (eventType) {
    case "answer":
      return { type: "ANSWER", stageId: record.stageId };
    case "clarify_request":
      return { type: "CLARIFY_REQUEST", stageId: record.stageId };
    case "back":
      return { type: "BACK", stageId: record.stageId };
    case "skip":
      return { type: "SKIP", stageId: record.stageId };
    case "retry":
    default:
      return { type: "ANSWER", stageId: record.stageId };
  }
}

export function isProgressEvent(event: SelfRegFlowEvent): boolean {
  return event.type === "ANSWER" || event.type === "SKIP";
}

export function isProgressRecord(record: RecordItem): boolean {
  return isProgressEvent(recordToFlowEvent(record));
}

export function isRetryRecord(records: RecordItem[], index: number): boolean {
  if (index <= 0) return false;
  const currentEvent = recordToFlowEvent(records[index]);
  const previousEvent = recordToFlowEvent(records[index - 1]);

  return (
    isProgressEvent(currentEvent) &&
    (previousEvent.type === "CLARIFY_REQUEST" || previousEvent.type === "BACK") &&
    previousEvent.stageId === currentEvent.stageId
  );
}

export function buildFlowEventSequence(
  record: RecordItem,
  options: { isRetry?: boolean; markComplete?: boolean } = {}
): SelfRegFlowEvent[] {
  const primaryEvent = recordToFlowEvent(record);
  const events: SelfRegFlowEvent[] = [];

  if (options.isRetry && isProgressEvent(primaryEvent)) {
    events.push({ type: "RETRY", stageId: record.stageId });
  }

  events.push(primaryEvent);

  if (options.markComplete && isProgressEvent(primaryEvent)) {
    events.push({ type: "COMPLETE", stageId: record.stageId });
  }

  return events;
}

export function getCompletedStageIds(records: RecordItem[]): Set<StageId> {
  return new Set(records.filter(isProgressRecord).map((record) => record.stageId));
}

export function isSessionComplete(records: RecordItem[], stageCount: number): boolean {
  return getCompletedStageIds(records).size >= stageCount;
}

export function getNextStageAfterProgress(record: RecordItem): StageId {
  return getNextStageForEvent(record.stageId, recordToFlowEvent(record).type);
}

export function createInitialFlowState(initialStageId: StageId = "1"): SelfRegFlowState {
  return {
    currentStageId: initialStageId,
    completedStageIds: new Set<StageId>(),
    progressCount: 0,
    clarifyCount: 0,
    backCount: 0,
    retryCount: 0,
    skipCount: 0,
    isComplete: false,
    lastEvent: undefined,
  };
}

export function applyFlowEvent(
  state: SelfRegFlowState,
  event: SelfRegFlowEvent,
  options: { stageCount?: number; initialStageId?: StageId } = {}
): SelfRegFlowState {
  const nextState: SelfRegFlowState = {
    currentStageId: state.currentStageId,
    completedStageIds: new Set(state.completedStageIds),
    progressCount: state.progressCount,
    clarifyCount: state.clarifyCount,
    backCount: state.backCount,
    retryCount: state.retryCount,
    skipCount: state.skipCount,
    isComplete: state.isComplete,
    lastEvent: event,
  };

  switch (event.type) {
    case "CLARIFY_REQUEST":
      nextState.clarifyCount += 1;
      nextState.currentStageId = getNextStageForEvent(event.stageId, event.type);
      return nextState;
    case "BACK":
      nextState.backCount += 1;
      nextState.currentStageId = getNextStageForEvent(event.stageId, event.type);
      return nextState;
    case "RETRY":
      nextState.retryCount += 1;
      nextState.currentStageId = getNextStageForEvent(event.stageId, event.type);
      return nextState;
    case "SKIP":
      nextState.skipCount += 1;
      nextState.progressCount += 1;
      nextState.completedStageIds.add(event.stageId);
      nextState.currentStageId = getNextStageForEvent(event.stageId, event.type);
      nextState.isComplete = nextState.completedStageIds.size >= (options.stageCount ?? STAGE_ORDER.length);
      return nextState;
    case "ANSWER":
      nextState.progressCount += 1;
      nextState.completedStageIds.add(event.stageId);
      nextState.currentStageId = getNextStageForEvent(event.stageId, event.type);
      nextState.isComplete = nextState.completedStageIds.size >= (options.stageCount ?? STAGE_ORDER.length);
      return nextState;
    case "COMPLETE":
      nextState.isComplete = true;
      nextState.currentStageId = options.initialStageId ?? "1";
      return nextState;
  }
}

export function reduceFlowState(
  records: RecordItem[],
  initialStageId: StageId = "1",
  stageCount = STAGE_ORDER.length
): SelfRegFlowState {
  let state = createInitialFlowState(initialStageId);

  records.forEach((record, index) => {
    const retry = isRetryRecord(records, index);
    const completedAfterRecord = isProgressRecord(record) && state.completedStageIds.size + 1 >= stageCount;
    const events = buildFlowEventSequence(record, {
      isRetry: retry,
      markComplete: completedAfterRecord,
    });

    events.forEach((event) => {
      state = applyFlowEvent(state, event, {
        stageCount,
        initialStageId,
      });
    });
  });

  return state;
}

export function serializeFlowState(state: SelfRegFlowState): SerializableSelfRegFlowState {
  return {
    currentStageId: state.currentStageId,
    completedStageIds: [...state.completedStageIds],
    progressCount: state.progressCount,
    clarifyCount: state.clarifyCount,
    backCount: state.backCount,
    retryCount: state.retryCount,
    skipCount: state.skipCount,
    isComplete: state.isComplete,
    lastEventType: state.lastEvent?.type,
  };
}

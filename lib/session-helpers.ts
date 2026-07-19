import type { RecordItem } from "@/types/session";
import type { Scenario, StageId } from "./selfreg-model";
import { getNextStage, getStageMeta, getStageQuestion } from "./selfreg-model";
import {
  inferEventTypeFromRecord,
  isProgressRecord as isFlowProgressRecord,
  isSessionComplete as isFlowSessionComplete,
} from "@/lib/selfreg-flow-machine";

export type { RecordItem };

export function inferRecordEventType(record: RecordItem): NonNullable<RecordItem["eventType"]> {
  return inferEventTypeFromRecord(record);
}

export function isProgressRecord(record: RecordItem): boolean {
  return isFlowProgressRecord(record);
}

export function countProgressStages(records: RecordItem[]): number {
  return new Set(
    records
      .filter(isProgressRecord)
      .map((record) => record.stageId),
  ).size;
}

export function formatProgressStageCount(count: number, lang: "ru" | "en"): string {
  if (lang === "en") {
    return `${count} ${count === 1 ? "step" : "steps"}`;
  }

  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;
  const label =
    lastTwoDigits >= 11 && lastTwoDigits <= 14
      ? "шагов"
      : lastDigit === 1
        ? "шаг"
        : lastDigit >= 2 && lastDigit <= 4
          ? "шага"
          : "шагов";

  return `${count} ${label}`;
}

export function isAnswerRecord(record: RecordItem): boolean {
  return inferRecordEventType(record) === "answer";
}

export function createRecord(params: {
  stageId: StageId;
  stageTitle: string;
  scenario: Scenario;
  answer: string;
  feedback: string;
  question: string;
  lang: "ru" | "en";
}): RecordItem {
  return {
    stageId: params.stageId,
    stageTitle: params.stageTitle,
    scenario: params.scenario,
    eventType: params.scenario === "skipped" ? "skip" : params.scenario === "clarify" ? "clarify_request" : "answer",
    answer: params.answer,
    feedback: params.feedback,
    question: params.question,
    timestamp: new Date().toISOString(),
  };
}

export function isSessionComplete(records: RecordItem[], stageCount: number): boolean {
  return isFlowSessionComplete(records, stageCount);
}

export function getNextStageInfo(params: {
  currentStageId: StageId;
  context: string;
  records: RecordItem[];
  lang: "ru" | "en";
}) {
  const nextStageId = getNextStage(params.currentStageId);
  const nextQuestion = getStageQuestion(
    nextStageId,
    params.context,
    params.records,
    params.lang
  );

  return {
    nextStageId,
    nextQuestion,
    nextStageMeta: getStageMeta(nextStageId, params.lang),
  };
}

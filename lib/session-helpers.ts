import type { StageId } from "./selfreg-model";
import { getNextStage, getStageMeta, getStageQuestion } from "./selfreg-model";
import type { Scenario } from "./selfreg-model";

// RecordItem теперь живёт в @/types/session (единый источник правды).
// Реэкспортируем для обратной совместимости с существующими импортами.
import type { RecordItem } from "@/types/session";
export type { RecordItem };


/**
 * Pure helper: creates a standard RecordItem.
 * Keeps record creation logic in one place (elegance + DRY).
 */
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
    answer: params.answer,
    feedback: params.feedback,
    question: params.question,
    timestamp: new Date().toLocaleString(params.lang === "en" ? "en-US" : "ru-RU"),
  };
}

/**
 * Pure helper: determines if the session should be considered complete.
 */
export function isSessionComplete(records: RecordItem[], stageCount: number): boolean {
  return records.length >= stageCount;
}

/**
 * Pure helper: returns the next stage and its question after adding a record.
 * Useful for clean advancement logic.
 */
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

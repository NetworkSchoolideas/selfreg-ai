"use client";

import { useState, useMemo, useCallback } from "react";
import { getStageMeta, getStageOrder, getStageQuestion, type StageId } from "@/lib/selfreg-model";
import { createRecord, getNextStageInfo, isSessionComplete } from "@/lib/session-helpers";
import type { RecordItem, SessionState, AdvanceResult } from "@/types/session";
import type { AppLang } from "@/lib/app-i18n";

interface UseAdolescentSessionParams {
  initialContext: string;
  lang: AppLang;
}

/**
 * Улучшенный хук управления сессией подростка.
 * - Строгая типизация через SessionState и AdvanceResult
 * - Вынесена логика advance, skip, reset
 * - useCallback для стабильности ре-рендеров
 */
export function useAdolescentSession({ initialContext, lang }: UseAdolescentSessionParams) {
  const stageCount = getStageOrder().length;

  const [context, setContext] = useState(initialContext);
  const [stageId, setStageId] = useState<StageId>("1");
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [finalNote, setFinalNote] = useState("");
  const [lastClarificationFeedback, setLastClarificationFeedback] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [pendingHistoryInsight, setPendingHistoryInsight] = useState<string | null>(null);
  const [suppressClarifyForNextStage, setSuppressClarifyForNextStage] = useState(false);

  const stage = useMemo(() => getStageMeta(stageId, lang), [stageId, lang]);

  const completedStages = useMemo(
    () => new Set(records.map(r => r.stageId)).size,
    [records]
  );

  const isCompleted = useMemo(
    () => completedStages >= stageCount && Boolean(finalNote),
    [completedStages, stageCount, finalNote]
  );

  const currentQuestion = useMemo(() => {
    return getStageQuestion(stageId, context, records, lang);
  }, [stageId, context, records, lang]);

  // === Core Actions (elegant, reusable, memoized) ===

  const addRecordAndAdvance = useCallback((record: RecordItem): AdvanceResult => {
    const nextRecords = [...records, record];
    setRecords(nextRecords);
    setAnswer("");

    if (isSessionComplete(nextRecords, stageCount)) {
      return { completed: true, nextRecords };
    }

    const { nextStageId } = getNextStageInfo({
      currentStageId: record.stageId as StageId,
      context,
      records: nextRecords,
      lang,
    });

    setStageId(nextStageId);
    return { completed: false, nextRecords, nextStageId };
  }, [records, context, lang, stageCount]);

  const clearClarification = useCallback(() => {
    setLastClarificationFeedback(null);
  }, []);

  const updateAnswer = useCallback((newAnswer: string) => {
    setAnswer(newAnswer);
  }, []);

  const resetSession = useCallback(() => {
    setContext(initialContext);
    setStageId("1");
    setRecords([]);
    setFinalNote("");
    setLastClarificationFeedback(null);
    setAnswer("");
    setPendingHistoryInsight(null);
    setSuppressClarifyForNextStage(false);
  }, [initialContext]);

  // Explicit skip of clarification recommendation.
  // Writes a cosmetic "skipped" record and advances.
  const skipClarification = useCallback((
    currentAnswer: string,
    currentQuestionText: string,
    stageTitle: string
  ): AdvanceResult => {
    const answerToUse = currentAnswer.trim() || "Пропущено";

    const skipRecord: RecordItem = {
      stageId,
      stageTitle,
      scenario: "skipped",
      answer: answerToUse,
      feedback: "Шаг пропущен пользователем (рекомендация по уточнению не использована).",
      question: currentQuestionText,
      timestamp: new Date().toLocaleString(lang === "en" ? "en-US" : "ru-RU"),
    };

    const adv = addRecordAndAdvance(skipRecord);
    clearClarification();

    // After explicit skip, give the user one clean next stage without immediate recommendation.
    setSuppressClarifyForNextStage(true);

    return adv;
  }, [stageId, lang, addRecordAndAdvance, clearClarification]);

  return {
    // State
    context,
    setContext,
    stageId,
    stage,
    records,
    setRecords,
    finalNote,
    setFinalNote,
    lastClarificationFeedback,
    setLastClarificationFeedback,
    answer,
    updateAnswer,
    pendingHistoryInsight,
    setPendingHistoryInsight,
    currentQuestion,
    isCompleted,
    completedStages,
    stageCount,
    suppressClarifyForNextStage,
    setSuppressClarifyForNextStage,

    // Actions
    addRecordAndAdvance,
    clearClarification,
    skipClarification,
    resetSession,
  };
}

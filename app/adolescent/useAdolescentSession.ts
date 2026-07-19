"use client";

import { useCallback, useMemo, useState } from "react";
import { createChildId } from "@/lib/children-storage";
import { getNextStageInfo, isProgressRecord, isSessionComplete } from "@/lib/session-helpers";
import { getStageMeta, getStageOrder, getStageQuestion, type StageId } from "@/lib/selfreg-model";
import type { AdvanceResult, RecordItem, Session } from "@/types/session";
import type { AppLang } from "@/lib/app-i18n";

interface UseAdolescentSessionParams {
  initialContext: string;
  lang: AppLang;
}

export function useAdolescentSession({ initialContext, lang }: UseAdolescentSessionParams) {
  const stageCount = getStageOrder().length;

  const [sessionId, setSessionId] = useState(() => createChildId());
  const [context, setContext] = useState(initialContext);
  const [stageId, setStageId] = useState<StageId>("1");
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [finalNote, setFinalNote] = useState("");
  const [lastClarificationFeedback, setLastClarificationFeedback] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [pendingHistoryInsight, setPendingHistoryInsight] = useState<string | null>(null);
  const [suppressClarifyForNextStage, setSuppressClarifyForNextStage] = useState(false);
  const [questionOverride, setQuestionOverride] = useState<string | null>(null);

  const stage = useMemo(() => getStageMeta(stageId, lang), [stageId, lang]);

  const completedStages = useMemo(
    () => new Set(records.filter(isProgressRecord).map((record) => record.stageId)).size,
    [records]
  );

  const isCompleted = useMemo(
    () => completedStages >= stageCount && Boolean(finalNote),
    [completedStages, stageCount, finalNote]
  );

  const currentQuestion = useMemo(
    () => questionOverride ?? getStageQuestion(stageId, context, records, lang),
    [stageId, context, records, lang, questionOverride]
  );

  const addProcessRecord = useCallback((record: RecordItem): RecordItem[] => {
    const nextRecords = [...records, record];
    setRecords(nextRecords);
    setAnswer("");
    return nextRecords;
  }, [records]);

  const addRecordAndAdvance = useCallback((record: RecordItem): AdvanceResult => {
    const nextRecords = [...records, record];
    setRecords(nextRecords);
    setAnswer("");
    setQuestionOverride(null);

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

  const addClarificationRequest = useCallback((
    currentQuestionText: string,
    stageTitle: string
  ): { record: RecordItem; nextRecords: RecordItem[] } => {
    const record: RecordItem = {
      stageId,
      stageTitle,
      scenario: "clarify",
      eventType: "clarify_request",
      answer: lang === "en" ? "The question was not clear." : "Вопрос был непонятен.",
      feedback: lang === "en"
        ? "You asked to clarify the wording. That is useful: the difficulty may be in the language of the prompt, not only in self-regulation."
        : "Ты попросил уточнить формулировку. Это полезный сигнал: трудность может быть не только в саморегуляции, но и в языке вопроса.",
      question: currentQuestionText,
      timestamp: new Date().toISOString(),
    };

    const nextRecords = [...records, record];
    setRecords(nextRecords);
    setLastClarificationFeedback(
      lang === "en"
        ? "Say it in your own words: what situation are we talking about, and what makes it difficult right now?"
        : "Скажу проще: о какой ситуации идет речь и что именно сейчас в ней мешает?"
    );

    return { record, nextRecords };
  }, [stageId, lang, records]);

  const canGoBack = useMemo(
    () => records.some(isProgressRecord),
    [records]
  );

  const goBackOneStep = useCallback((): { record: RecordItem; nextRecords: RecordItem[] } | null => {
    const progressIndexes = records
      .map((record, index) => ({ record, index }))
      .filter(({ record }) => isProgressRecord(record));
    const lastProgress = progressIndexes.at(-1);
    if (!lastProgress) return null;

    const previous = lastProgress.record;
    const backRecord: RecordItem = {
      stageId: previous.stageId,
      stageTitle: previous.stageTitle,
      scenario: "clarify",
      eventType: "back",
      answer: lang === "en" ? "Returned to revise the previous answer." : "Вернулся к предыдущему вопросу, чтобы изменить ответ.",
      feedback: lang === "en"
        ? "The adolescent returned to the previous question. The dashboard should treat the next answer as a revised attempt."
        : "Подросток вернулся к предыдущему вопросу. Следующий ответ стоит считать повторной попыткой, а не новым этапом.",
      question: previous.question,
      timestamp: new Date().toISOString(),
    };

    const nextRecords = [...records, backRecord];
    setRecords(nextRecords);
    setStageId(previous.stageId);
    setQuestionOverride(previous.question);
    setAnswer(previous.answer);
    setFinalNote("");
    setLastClarificationFeedback(null);
    setSuppressClarifyForNextStage(false);
    return { record: backRecord, nextRecords };
  }, [records, lang]);

  const resetSession = useCallback(() => {
    setSessionId(createChildId());
    setContext(initialContext);
    setStageId("1");
    setRecords([]);
    setFinalNote("");
    setLastClarificationFeedback(null);
    setAnswer("");
    setPendingHistoryInsight(null);
    setSuppressClarifyForNextStage(false);
    setQuestionOverride(null);
  }, [initialContext]);

  const skipClarification = useCallback((
    currentAnswer: string,
    currentQuestionText: string,
    stageTitle: string
  ): AdvanceResult => {
    const answerToUse = currentAnswer.trim() || (lang === "en" ? "Skipped" : "Пропущено");

    const skipRecord: RecordItem = {
      stageId,
      stageTitle,
      scenario: "skipped",
      eventType: "skip",
      answer: answerToUse,
      feedback: lang === "en"
        ? "The step was skipped by the user; the clarification recommendation was not used."
        : "Шаг пропущен пользователем; рекомендация по уточнению не использована.",
      question: currentQuestionText,
      timestamp: new Date().toISOString(),
    };

    const adv = addRecordAndAdvance(skipRecord);
    clearClarification();
    setSuppressClarifyForNextStage(true);

    return adv;
  }, [stageId, lang, addRecordAndAdvance, clearClarification]);

  const restoreSession = useCallback((savedSession: Session) => {
    const savedRecords = savedSession.records ?? [];
    const progressRecords = savedRecords.filter(isProgressRecord);
    const lastProgressRecord = progressRecords.at(-1);
    const lastRecord = savedRecords.at(-1);

    setSessionId(savedSession.sessionId || createChildId());
    setContext(savedSession.context || initialContext);
    setRecords(savedRecords);
    setFinalNote(savedSession.finalNote || "");
    setLastClarificationFeedback(null);
    setAnswer("");
    setPendingHistoryInsight(savedSession.historyInsight || null);
    setSuppressClarifyForNextStage(false);
    setQuestionOverride(null);

    if (lastRecord?.eventType === "back") {
      const revisedRecord = savedRecords
        .slice(0, -1)
        .reverse()
        .find((record) => isProgressRecord(record) && record.stageId === lastRecord.stageId);

      setStageId(lastRecord.stageId as StageId);
      setQuestionOverride(revisedRecord?.question ?? lastRecord.question ?? null);
      setAnswer(revisedRecord?.answer ?? "");
      return;
    }

    if (!lastProgressRecord || savedSession.finalNote?.trim()) {
      setStageId("1");
      return;
    }

    const { nextStageId } = getNextStageInfo({
      currentStageId: lastProgressRecord.stageId as StageId,
      context: savedSession.context || initialContext,
      records: savedRecords,
      lang,
    });
    setStageId(nextStageId);
  }, [initialContext, lang]);

  return {
    sessionId,
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
    canGoBack,
    addProcessRecord,
    addRecordAndAdvance,
    addClarificationRequest,
    goBackOneStep,
    clearClarification,
    skipClarification,
    restoreSession,
    resetSession,
  };
}

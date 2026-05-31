"use client";

import { useState, useCallback } from "react";
import { aiService } from "@/services/ai-service";
import { answerValidator } from "@/lib/answer-validator";
import { sessionManager } from "@/lib/session-manager";
import { buildSessionSummary } from "@/lib/session-summary";
import { ChildrenStorage } from "@/lib/children-storage";
import type { ProviderId } from "@/lib/provider-registry";
import type { AppLang } from "@/lib/app-i18n";
import type { Scenario, StageId } from "@/lib/selfreg-model";
import type { RecordItem, Session, CompletedSession, AiStageResult, AnswerQualityResult } from "@/types/session";

const log = (message: string) => {
  if (process.env.NODE_ENV === "development") {
    console.log(`[useSessionSubmit] ${message}`);
  }
};

/**
 * Результат отправки ответа.
 */
export interface SubmitResult {
  success: boolean;
  record?: RecordItem;
  completed?: boolean;
  nextRecords?: RecordItem[];
  error?: string;
  responseMode?: string;
  clarificationNeeded?: boolean;
  clarifyFeedback?: string;
}

/**
 * Хук для управления логикой отправки ответов, API и сохранения.
 * Выносит из AdolescentPrototype.tsx:
 *  - submitAnswer
 *  - валидацию ответа
 *  - взаимодействие с AI API
 *  - сохранение сессии
 *  - обработку race conditions и unmount
 */
interface UseSessionSubmitOptions {
  context: string;
  stageId: StageId;
  stageTitle: string;
  currentQuestion: string;
  records: RecordItem[];
  finalNote: string;
  lang: AppLang;
  provider: ProviderId;
  model?: string;
  userApiKey?: string;
  currentChildId: string | null;
  pendingHistoryInsight: string | null;
  addRecordAndAdvance: (record: RecordItem) => { completed: boolean; nextRecords: RecordItem[]; nextStageId?: StageId };
  setFinalNote: (note: string) => void;
  setLastClarificationFeedback: (feedback: string | null) => void;
  setSuppressClarifyForNextStage: (suppress: boolean) => void;
  setProviderStatus: (status: string) => void;
}

export function useSessionSubmit(options: UseSessionSubmitOptions) {
  const {
    context,
    stageId,
    stageTitle,
    currentQuestion,
    records,
    finalNote,
    lang,
    provider,
    model,
    userApiKey,
    currentChildId,
    pendingHistoryInsight,
    addRecordAndAdvance,
    setFinalNote,
    setLastClarificationFeedback,
    setSuppressClarifyForNextStage,
    setProviderStatus,
  } = options;

  const [isSending, setIsSending] = useState(false);
  const [answerQualityWarning, setAnswerQualityWarning] = useState<string | null>(null);
  const [providerStatus, setInternalProviderStatus] = useState(
    lang === "en"
      ? "Mock mode: you can go through the scenario without an external key."
      : "Mock-режим: можно пройти сценарий без внешнего ключа."
  );

  // Валидация ответа
  const validateAnswer = useCallback((answer: string): AnswerQualityResult => {
    return answerValidator.validateAnswer(answer, lang);
  }, [lang]);

  // Формирование summary для завершённой сессии
  const buildFinalNote = useCallback((ctx: string, recs: RecordItem[]): string => {
    return buildSessionSummary(ctx, recs, lang);
  }, [lang]);

  // Сохранение сессии
  const saveSession = useCallback((nextRecords: RecordItem[], note: string) => {
    const payload: Session = {
      context,
      records: nextRecords,
      finalNote: note,
      updatedAt: new Date().toISOString(),
      lang,
      childId: currentChildId || undefined,
    };

    if (pendingHistoryInsight) {
      payload.historyInsight = pendingHistoryInsight;
    }

    // Save via sessionManager (uses localStorage)
    sessionManager.saveSession(payload);
    
    // Also save to ChildrenStorage (syncs to Supabase if available)
    if (currentChildId) {
      ChildrenStorage.saveSessionForChild(currentChildId, payload);
      log("Session saved to Supabase (async)");
    }
  }, [context, lang, currentChildId, pendingHistoryInsight]);

  // Основная логика отправки
  const submitAnswer = useCallback(async (
    answer: string,
    suppressClarifyForNextStage: boolean
  ): Promise<SubmitResult> => {
    const cleanAnswer = answer.trim();
    
    // Валидация
    const quality = validateAnswer(cleanAnswer);
    if (!quality.ok) {
      setAnswerQualityWarning(quality.message || (lang === "en" ? "Please write a more thoughtful answer." : "Напиши более осознанный ответ."));
      return { success: false, error: quality.message };
    }
    setAnswerQualityWarning(null);

    setIsSending(true);

    // Контроллер для отмены запроса при unmount
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      // Mock-ответ по умолчанию
      let apiResult: AiStageResult = {
        scenario: "A",
        feedback: "Mock feedback",
        finalNote: "",
        responseMode: "mock",
      };

      // Запрос к API
      const history = records.map((item) => ({
        stage: item.stageId,
        answer: item.answer,
        feedback: item.feedback,
      }));

      try {
        const response = await aiService.getResponse(
          {
            userId: "demo-user",
            answer: cleanAnswer,
            currentStage: stageId,
            context,
            provider,
            model: model?.trim() || undefined,
            userApiKey: userApiKey?.trim() || undefined,
            lang,
            history,
          },
          { signal: controller.signal, timeoutMs: 30000 }
        );

        apiResult = response;
        setInternalProviderStatus(`${provider}: ${lang === "en" ? "received response" : "получен ответ"}`);
      } catch (apiError) {
        const message = apiError instanceof Error ? apiError.message : lang === "en" ? "unknown error" : "неизвестная ошибка";
        setInternalProviderStatus(
          lang === "en"
            ? `Could not get an LLM reply: ${message}. A safe mock feedback was shown.`
            : `Не удалось получить LLM-ответ: ${message}. Показан безопасный mock-фидбек.`
        );
      }

      // Обработка clarify
      if (apiResult.scenario === "clarify") {
        if (suppressClarifyForNextStage) {
          setSuppressClarifyForNextStage(false);
          setLastClarificationFeedback(null);
        } else {
          setLastClarificationFeedback(apiResult.feedback);
        }
        return {
          success: true,
          clarificationNeeded: true,
          clarifyFeedback: apiResult.feedback,
        };
      }

      setLastClarificationFeedback(null);
      setSuppressClarifyForNextStage(false);

      // Создание записи
      const item: RecordItem = {
        stageId,
        stageTitle,
        scenario: apiResult.scenario,
        answer: cleanAnswer,
        feedback: apiResult.feedback,
        question: currentQuestion,
        timestamp: new Date().toLocaleString(lang === "en" ? "en-US" : "ru-RU"),
      };

      const adv = addRecordAndAdvance(item);

      // Проверка завершения
      if (adv.completed && !finalNote) {
        const note = buildFinalNote(context, adv.nextRecords);
        setFinalNote(note);
        saveSession(adv.nextRecords, note);
      }

      return {
        success: true,
        record: item,
        completed: adv.completed,
        nextRecords: adv.nextRecords,
        responseMode: apiResult.responseMode,
      };
    } catch (error) {
      if (controller.signal.aborted) {
        return {
          success: false,
          error: lang === "en" ? "Request timed out" : "Запрос истёк по времени",
        };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : lang === "en" ? "Unknown error" : "Неизвестная ошибка",
      };
    } finally {
      clearTimeout(timeoutId);
      if (!controller.signal.aborted) {
        setIsSending(false);
      }
    }
  }, [
    context,
    stageId,
    stageTitle,
    currentQuestion,
    records,
    finalNote,
    lang,
    provider,
    model,
    userApiKey,
    validateAnswer,
    buildFinalNote,
    saveSession,
    addRecordAndAdvance,
    setFinalNote,
    setLastClarificationFeedback,
    setSuppressClarifyForNextStage,
  ]);

  return {
    isSending,
    answerQualityWarning,
    providerStatus: providerStatus,
    setProviderStatus: setInternalProviderStatus,
    submitAnswer,
    setAnswerQualityWarning,
  };
}

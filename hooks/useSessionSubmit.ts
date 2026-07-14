"use client";

import { useState, useCallback, useRef } from "react";
import { aiService } from "@/services/ai-service";
import { answerValidator } from "@/lib/answer-validator";
import { sessionManager } from "@/lib/session-manager";
import { buildSessionSummary } from "@/lib/session-summary";
import { DataService } from "@/lib/data-service";
import { decideSupportScenarioDetailed } from "@/lib/scenario-engine";
import { makeMockFeedback } from "@/lib/selfreg-model";
import type { ProviderId } from "@/lib/provider-registry";
import type { AppLang } from "@/lib/app-i18n";
import type { StageId } from "@/lib/selfreg-model";
import type { RecordItem, Session, AiStageResult, AnswerQualityResult, SafetyResult } from "@/types/session";

const log = (message: string) => {
  if (process.env.NODE_ENV === "development") {
    console.log(`[useSessionSubmit] ${message}`);
  }
};

export interface SubmitResult {
  success: boolean;
  record?: RecordItem;
  completed?: boolean;
  nextRecords?: RecordItem[];
  error?: string;
  responseMode?: string;
  clarificationNeeded?: boolean;
  clarifyFeedback?: string;
  safety?: SafetyResult;
}

interface UseSessionSubmitOptions {
  sessionId: string;
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
  localSessionStorageKey?: string;
  pendingHistoryInsight: string | null;
  addProcessRecord: (record: RecordItem) => RecordItem[];
  addRecordAndAdvance: (record: RecordItem) => { completed: boolean; nextRecords: RecordItem[]; nextStageId?: StageId };
  setFinalNote: (note: string) => void;
  setLastClarificationFeedback: (feedback: string | null) => void;
  setSuppressClarifyForNextStage: (suppress: boolean) => void;
  setProviderStatus: (status: string) => void;
}

export function useSessionSubmit(options: UseSessionSubmitOptions) {
  const {
    sessionId,
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
    localSessionStorageKey,
    pendingHistoryInsight,
    addProcessRecord,
    addRecordAndAdvance,
    setFinalNote,
    setLastClarificationFeedback,
    setSuppressClarifyForNextStage,
    setProviderStatus,
  } = options;

  const [isSending, setIsSending] = useState(false);
  const [answerQualityWarning, setAnswerQualityWarning] = useState<string | null>(null);
  const [safetyNotice, setSafetyNotice] = useState<SafetyResult | null>(null);
  const inFlightRef = useRef(false);

  const validateAnswer = useCallback((answer: string): AnswerQualityResult => {
    return answerValidator.validateAnswer(answer, lang);
  }, [lang]);

  const buildFinalNote = useCallback((ctx: string, recs: RecordItem[]): string => {
    return buildSessionSummary(ctx, recs, lang);
  }, [lang]);

  const saveSession = useCallback(async (nextRecords: RecordItem[], note: string) => {
    const payload: Session = {
      sessionId,
      status: note.trim() ? "completed" : "in_progress",
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

    if (currentChildId) {
      await DataService.saveSession(currentChildId, payload);
      log("Session saved to storage");
    } else {
      sessionManager.saveLocalSession(payload, localSessionStorageKey);
    }
  }, [sessionId, context, lang, currentChildId, localSessionStorageKey, pendingHistoryInsight]);

  const submitAnswer = useCallback(async (
    answer: string,
    suppressClarifyForNextStage: boolean
  ): Promise<SubmitResult> => {
    if (inFlightRef.current) {
      return {
        success: false,
        error: lang === "en" ? "A request is already in progress" : "Запрос уже выполняется",
      };
    }

    const cleanAnswer = answer.trim();

    const quality = validateAnswer(cleanAnswer);
    if (!quality.ok) {
      setAnswerQualityWarning(
        quality.message || (lang === "en" ? "Please write a more thoughtful answer." : "Напиши более осознанный ответ.")
      );
      return { success: false, error: quality.message };
    }
    setAnswerQualityWarning(null);
    inFlightRef.current = true;
    setIsSending(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      let apiResult: AiStageResult = {
        scenario: "A",
        feedback: "Mock feedback",
        finalNote: "",
        responseMode: "mock",
      };

      const history = records.map((item) => ({
        stage: item.stageId,
        answer: item.answer,
        feedback: item.feedback,
        scenario: item.scenario,
        eventType: item.eventType,
      }));

      const localScenario = decideSupportScenarioDetailed(
        cleanAnswer,
        context,
        history,
        lang,
        undefined,
        stageId
      ).scenario;
      const localFallback = makeMockFeedback({
        stageId,
        answer: cleanAnswer,
        context,
        history,
        lang,
        forcedScenario: localScenario === "skipped" ? "A" : localScenario,
      });

      apiResult = {
        scenario: localFallback.scenario === "skipped" ? "A" : localFallback.scenario,
        feedback: localFallback.feedback,
        finalNote: localFallback.finalNote,
        responseMode: "mock",
      };

      try {
        apiResult = await aiService.getResponse(
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

        setProviderStatus(
          `${provider}: ${lang === "en" ? "received response" : "получен ответ"} (${apiResult.responseMode})`
        );
      } catch (apiError) {
        const message = apiError instanceof Error ? apiError.message : lang === "en" ? "unknown error" : "неизвестная ошибка";
        const providerErrorMessage =
          lang === "en"
            ? `Could not get an LLM reply: ${message}. Check the key, provider, or model and try again.`
            : `Не удалось получить LLM-ответ: ${message}. Проверьте ключ, провайдера или модель и попробуйте снова.`;
        setProviderStatus(providerErrorMessage);
        setAnswerQualityWarning(providerErrorMessage);

        if (provider !== "mock") {
          return {
            success: false,
            error: providerErrorMessage,
          };
        }
      }

      if (apiResult.safety) {
        setProviderStatus(apiResult.safety.message);
        setAnswerQualityWarning(apiResult.safety.message);
        setSafetyNotice(apiResult.safety);
        return {
          success: false,
          error: apiResult.safety.message,
          safety: apiResult.safety,
        };
      }

      if (apiResult.scenario === "clarify") {
        const clarifyRecord: RecordItem = {
          stageId,
          stageTitle,
          scenario: "clarify",
          eventType: "clarify_request",
          provider,
          model: model?.trim() || undefined,
          responseMode: apiResult.responseMode,
          answer: cleanAnswer,
          feedback: apiResult.feedback,
          question: currentQuestion,
          timestamp: new Date().toISOString(),
        };

        const nextRecords = addProcessRecord(clarifyRecord);
        await saveSession(nextRecords, "");

        if (suppressClarifyForNextStage) {
          setSuppressClarifyForNextStage(false);
          setLastClarificationFeedback(null);
        } else {
          setLastClarificationFeedback(apiResult.feedback);
        }

        return {
          success: true,
          record: clarifyRecord,
          clarificationNeeded: true,
          clarifyFeedback: apiResult.feedback,
          nextRecords,
          responseMode: apiResult.responseMode,
        };
      }

      setLastClarificationFeedback(null);
      setSuppressClarifyForNextStage(false);

        const item: RecordItem = {
        stageId,
        stageTitle,
        scenario: apiResult.scenario,
        eventType: "answer",
        provider,
        model: model?.trim() || undefined,
        responseMode: apiResult.responseMode,
        answer: cleanAnswer,
        feedback: apiResult.feedback,
        question: currentQuestion,
        timestamp: new Date().toISOString(),
      };

      const adv = addRecordAndAdvance(item);
      const note = adv.completed ? (finalNote || buildFinalNote(context, adv.nextRecords)) : "";

      if (adv.completed && !finalNote) {
        setFinalNote(note);
      }

      await saveSession(adv.nextRecords, note);

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
          error: lang === "en" ? "Request timed out" : "Запрос истек по времени",
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : lang === "en" ? "Unknown error" : "Неизвестная ошибка",
      };
    } finally {
      clearTimeout(timeoutId);
      inFlightRef.current = false;
      setIsSending(false);
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
    addProcessRecord,
    addRecordAndAdvance,
    setFinalNote,
    setLastClarificationFeedback,
    setSuppressClarifyForNextStage,
    setProviderStatus,
  ]);

  return {
    isSending,
    answerQualityWarning,
    safetyNotice,
    submitAnswer,
    saveSessionSnapshot: saveSession,
    setAnswerQualityWarning,
    setSafetyNotice,
  };
}

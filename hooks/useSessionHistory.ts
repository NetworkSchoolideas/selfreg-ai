import { useState, useEffect, useCallback } from "react";
import { DataService } from "@/lib/data-service";
import { aiService } from "@/services/ai-service";
import type { ProviderId } from "@/lib/provider-registry";
import type { AppLang } from "@/lib/app-i18n";
import type { CompletedSession } from "@/types/session";

/**
 * Хук для работы с историей сессий пользователя.
 * Отвечает за:
 *  - загрузку завершённых сессий для childId
 *  - генерацию AI-комментария на основе истории
 *  - управление состоянием загрузки/ошибок
 *
 * Использует AIService для API-вызовов.
 * Поддерживает Supabase с fallback на localStorage.
 */
interface UseSessionHistoryOptions {
  childId: string | null;
  lang: AppLang;
  provider: ProviderId;
  model?: string;
  userApiKey?: string;
}

interface UseSessionHistoryReturn {
  // State
  pastSessions: CompletedSession[];
  historyAIComment: string | null;
  isLoadingHistoryAI: boolean;
  error: string | null;

  // Actions
  reloadSessions: () => void;
  generateHistoryInsight: () => Promise<void>;
  clearHistoryAIComment: () => void;
}

const log = (message: string) => {
  if (process.env.NODE_ENV === "development") {
    console.log(`[useSessionHistory] ${message}`);
  }
};

export function useSessionHistory(options: UseSessionHistoryOptions): UseSessionHistoryReturn {
  const { childId, lang, provider, model, userApiKey } = options;

  const [pastSessions, setPastSessions] = useState<CompletedSession[]>([]);
  const [historyAIComment, setHistoryAIComment] = useState<string | null>(null);
  const [isLoadingHistoryAI, setIsLoadingHistoryAI] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    if (!childId) {
      setPastSessions([]);
      log("No childId, cleared sessions");
      return;
    }

    try {
      const response = await fetch(`/api/children?childId=${encodeURIComponent(childId)}`, {
        cache: "no-store",
      });

      if (response.ok) {
        const payload = await response.json();
        if (payload?.child) {
          await DataService.saveChild(payload.child);
        }
      }
    } catch {
      log("Server history load failed, using local mirror");
    }

    const sessions = await DataService.getCompletedSessions(childId);
    setPastSessions(sessions);
    log(`Loaded ${sessions.length} completed sessions`);
  }, [childId]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadSessions();
    });
  }, [loadSessions]);

  // Генерация AI-комментария
  const generateHistoryInsight = useCallback(async () => {
    if (pastSessions.length === 0 || provider === "mock") return;

    setIsLoadingHistoryAI(true);
    setHistoryAIComment(null);
    setError(null);

    const controller = new AbortController();

    try {
      const insight = await aiService.getHistoryInsight(
        pastSessions,
        provider,
        model,
        userApiKey,
        lang,
        { timeoutMs: 30000, signal: controller.signal }
      );

      if (!controller.signal.aborted) {
        setHistoryAIComment(insight);
        
        // Save insight to storage (will sync to Supabase if available)
        if (childId && insight) {
          await DataService.attachHistoryInsight(childId, insight);
          log("History insight saved");
        }
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoadingHistoryAI(false);
      }
    }
  }, [pastSessions, provider, model, userApiKey, lang, childId]);

  const reloadSessions = useCallback(() => {
    void loadSessions();
  }, [loadSessions]);

  const clearHistoryAIComment = useCallback(() => {
    setHistoryAIComment(null);
    setError(null);
  }, []);

  return {
    pastSessions,
    historyAIComment,
    isLoadingHistoryAI,
    error,
    reloadSessions,
    generateHistoryInsight,
    clearHistoryAIComment,
  };
}

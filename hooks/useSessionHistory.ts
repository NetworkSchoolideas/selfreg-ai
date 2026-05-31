import { useState, useEffect, useCallback } from "react";
import { ChildrenStorage } from "@/lib/children-storage";
import { isSupabaseAvailable } from "@/lib/supabase";
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

  // Load sessions when childId changes (using callback pattern)
  const loadSessions = useCallback(() => {
    if (!childId) {
      setPastSessions([]);
      log("No childId, cleared sessions");
      return;
    }
    
    const sessions = ChildrenStorage.getCompletedSessionsForChild(childId);
    setPastSessions(sessions);
    log(`Loaded ${sessions.length} completed sessions`);
    
    // Check if Supabase is available and log status
    if (isSupabaseAvailable()) {
      log("Supabase is available for data sync");
    } else {
      log("Using localStorage only");
    }
  }, [childId]);

  // Initial load and reload when childId changes
  useEffect(() => {
    if (!childId) {
      setPastSessions([]); // eslint-disable-line react-hooks/set-state-in-effect
      return;
    }
    
    const sessions = ChildrenStorage.getCompletedSessionsForChild(childId);
    setPastSessions(sessions); // eslint-disable-line react-hooks/set-state-in-effect
  }, [childId]);

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
          ChildrenStorage.attachHistoryInsight(childId, insight);
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
    if (childId) {
      const sessions = ChildrenStorage.getCompletedSessionsForChild(childId);
      setPastSessions(sessions);
      log(`Reloaded ${sessions.length} sessions`);
    }
  }, [childId]);

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

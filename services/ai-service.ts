import type { ProviderId } from "@/lib/provider-registry";
import type { AppLang } from "@/lib/app-i18n";
import type { StageId, Scenario } from "@/lib/selfreg-model";
import type { RecordItem, CompletedSession, ResponseMode, AiStageResult, ChatHistoryItem } from "@/types/session";

/**
 * Сервис для общения с AI (чистый слой над API).
 * Отвечает за:
 *  - отправку запросов на /api/chat
 *  - генерацию insight по истории
 *  - обработку ошибок и таймаутов
 *
 * Не зависит от React — можно использовать в хуках и тестах.
 */
export class AIService {
  private readonly baseUrl: string;

  constructor(baseUrl = "") {
    this.baseUrl = baseUrl;
  }

  /**
   * Отправляет ответ пользователя на сервер и получает структурированный фидбек.
   *
   * @param payload Данные запроса
   * @param options Опции запроса (таймаут, контроллер для отмены)
   * @returns Результат с scenario, feedback и responseMode
   */
  async getResponse(
    payload: {
      userId: string;
      answer: string;
      currentStage: StageId;
      context: string;
      provider: ProviderId;
      model?: string;
      userApiKey?: string;
      lang: AppLang;
      history: Array<{ stage: string; answer: string; feedback?: string }>;
      forcedScenario?: Scenario;
    },
    options?: {
      timeoutMs?: number;
      signal?: AbortSignal;
    }
  ): Promise<AiStageResult> {
    const controller = new AbortController();
    const timeoutId = options?.timeoutMs
      ? setTimeout(() => controller.abort(), options.timeoutMs)
      : undefined;

    const abortSignal = options?.signal;
    if (abortSignal) {
      abortSignal.addEventListener("abort", () => controller.abort());
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (options?.timeoutMs) {
        clearTimeout(timeoutId);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Unknown error from chat API");
      }

      return {
        scenario: data.scenario as Scenario,
        feedback: data.feedback || "",
        finalNote: data.dashboardNote || "",
        responseMode: (data.responseMode as ResponseMode) || "mock",
      };
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error("Request timed out");
      }
      throw error;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  /**
   * Генерирует комментарий на основе прошлых сессий (для возвращающихся пользователей).
   *
   * @param pastSessions Завершённые сессии
   * @param provider Провайдер AI
   * @param model Модель
   * @param userApiKey API-ключ
   * @param lang Язык
   * @param options Опции запроса
   * @returns Сгенерированный комментарий или null при ошибке
   */
  async getHistoryInsight(
    pastSessions: CompletedSession[],
    provider: ProviderId,
    model?: string,
    userApiKey?: string,
    lang: AppLang = "ru",
    options?: {
      timeoutMs?: number;
      signal?: AbortSignal;
    }
  ): Promise<string | null> {
    if (pastSessions.length === 0) return null;

    const latest = pastSessions[0];
    const dateStr = new Date(latest.updatedAt).toLocaleDateString(lang === "en" ? "en-US" : "ru-RU");

    const latestBlock = `Most recent session (${dateStr}):
Context: ${latest.context}
Conclusion: ${latest.finalNote}`;

    const prompt = `You are a supportive AI mentor for adolescents practicing self-regulation.

The teenager has completed ${pastSessions.length} self-regulation session(s) in total. This is a positive achievement and sign of growing self-awareness.

Details of the latest completed session:
${latestBlock}

Write a short, warm, encouraging message (3-5 sentences): a greeting acknowledging their progress + 1 gentle observation from the recent session + a motivating note before they start a new cycle. Keep it concrete, non-judgmental and hopeful.`;

    const controller = new AbortController();
    const timeoutId = options?.timeoutMs
      ? setTimeout(() => controller.abort(), options.timeoutMs)
      : undefined;

    const abortSignal = options?.signal;
    if (abortSignal) {
      abortSignal.addEventListener("abort", () => controller.abort());
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "history-insight",
          answer: prompt,
          currentStage: "history",
          context: lang === "en" ? "History of past self-regulation sessions" : "История прошлых сессий саморегуляции",
          provider,
          model: model?.trim() || undefined,
          userApiKey: userApiKey?.trim() || undefined,
          lang,
          history: [] as ChatHistoryItem[],
        }),
        signal: controller.signal,
      });

      if (options?.timeoutMs) {
        clearTimeout(timeoutId);
      }

      const data = await response.json();

      if (!response.ok) {
        console.error("History insight API error:", data?.error);
        return null;
      }

      return data.feedback || data.result?.feedback || null;
    } catch (error) {
      if (controller.signal.aborted) {
        console.error("History insight request timed out");
        return null;
      }
      console.error("History insight error:", error);
      return null;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  /**
   * Проверяет, доступен ли провайдер (простой health-check).
   */
  async checkProvider(provider: ProviderId, userApiKey?: string, signal?: AbortSignal): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/provider-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, userApiKey }),
        signal,
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Singleton для использования в хуках
export const aiService = new AIService();

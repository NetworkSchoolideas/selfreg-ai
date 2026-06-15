/**
 * DataService — единый слой данных для SelfReg AI.
 *
 * Двухуровневая архитектура:
 *   1. Supabase (если включён + аутентифицирован) — первичный источник
 *   2. localStorage — fallback (всегда доступен)
 *
 * Чтение:
 *   - Сначала пробуем Supabase (через fetchChildrenFromSupabase / fetchChildFromSupabase)
 *   - При ошибке или недоступности → читаем из localStorage (ChildrenStorage)
 *
 * Запись:
 *   - Всегда пишем в localStorage (синхронно, гарантированно)
 *   - Асинхронно дублируем в Supabase (через ChildrenStorage.async методы)
 *
 * Mock mode (NEXT_PUBLIC_SUPABASE_ENABLED !== 'true'):
 *   - Работаем только с localStorage
 *   - Никаких запросов к Supabase
 *
 * @module data-service
 */

import type { AdolescentFeedback, ChildProfile, Session } from "@/types/session";
import { ChildrenStorage } from "@/lib/children-storage";
import {
  fetchChildrenFromSupabase,
  fetchChildFromSupabase,
} from "@/lib/server-storage";
import { isSupabaseAvailable } from "@/lib/supabase";
import { getSession } from "@/lib/supabase-auth";

// ============================================================================
// Types
// ============================================================================

export interface SessionUpsertInput {
  childId: string;
  session: Session;
}

export interface FeedbackInput {
  childId: string;
  feedback: AdolescentFeedback;
}

export interface HistoryInsightInput {
  childId: string;
  insight: string;
}

// ============================================================================
// Helpers
// ============================================================================

const log = (message: string, data?: unknown) => {
  if (process.env.NODE_ENV === "development") {
    console.log(`[DataService] ${message}`, data ?? "");
  }
};

/**
 * Проверяет, доступен ли Supabase и есть ли активная сессия.
 * Если Supabase не настроен — возвращаем false (работаем через localStorage).
 */
async function isSupabaseReady(): Promise<boolean> {
  if (!isSupabaseAvailable()) {
    return false;
  }

  try {
    const { data } = await getSession();
    return !!data?.session;
  } catch {
    return false;
  }
}

// ============================================================================
// DataService
// ============================================================================

export const DataService = {
  // ========================================================================
  // Children
  // ========================================================================

  /**
   * Получить всех детей.
   * - Supabase: фильтр по teacherId (если передан)
   * - localStorage: все дети
   */
  async getChildren(teacherId?: string): Promise<ChildProfile[]> {
    // Пробуем Supabase
    if (await isSupabaseReady()) {
      try {
        const children = await fetchChildrenFromSupabase(teacherId);
        if (children.length > 0) {
          log(`Loaded ${children.length} children from Supabase`);
          return children;
        }
      } catch (err) {
        log("Supabase fetch failed, falling back to localStorage", err);
      }
    }

    // Fallback: localStorage
    const local = ChildrenStorage.getAll();
    const filtered = teacherId
      ? local.filter((c) => c.teacherId === teacherId)
      : local;
    log(`Loaded ${filtered.length} children from localStorage`);
    return filtered;
  },

  /**
   * Получить одного ребёнка по ID.
   */
  async getChild(childId: string): Promise<ChildProfile | null> {
    // Пробуем Supabase
    if (await isSupabaseReady()) {
      try {
        const child = await fetchChildFromSupabase(childId);
        if (child) {
          log(`Loaded child ${childId} from Supabase`);
          return child;
        }
      } catch (err) {
        log("Supabase fetch failed, falling back to localStorage", err);
      }
    }

    // Fallback: localStorage
    const local = ChildrenStorage.getChild(childId);
    return local ?? null;
  },

  /**
   * Сохранить/обновить ребёнка.
   * - Всегда пишем в localStorage
   * - Асинхронно дублируем в Supabase (через ChildrenStorage.upsertLocalChildAsync)
   */
  async saveChild(child: ChildProfile): Promise<ChildProfile> {
    await ChildrenStorage.upsertLocalChildAsync(child);
    return child;
  },

  /**
   * Удалить ребёнка.
   * - Всегда удаляем из localStorage
   * - Асинхронно удаляем из Supabase (через ChildrenStorage.deleteChildAsync)
   */
  async deleteChild(childId: string): Promise<boolean> {
    return ChildrenStorage.deleteChildAsync(childId);
  },

  // ========================================================================
  // Sessions
  // ========================================================================

  /**
   * Получить все сессии ребёнка.
   */
  async getSessions(childId: string): Promise<Session[]> {
    // Пробуем Supabase
    if (await isSupabaseReady()) {
      try {
        const child = await fetchChildFromSupabase(childId);
        if (child && child.sessions.length > 0) {
          log(`Loaded ${child.sessions.length} sessions for child ${childId} from Supabase`);
          return child.sessions;
        }
      } catch (err) {
        log("Supabase fetch failed, falling back to localStorage", err);
      }
    }

    // Fallback: localStorage
    const local = ChildrenStorage.getSessionsForChild(childId);
    log(`Loaded ${local.length} sessions for child ${childId} from localStorage`);
    return local;
  },

  /**
   * Сохранить сессию для ребёнка.
   * - Всегда пишем в localStorage
   * - Асинхронно дублируем в Supabase (через ChildrenStorage.saveSessionForChildAsync)
   */
  async saveSession(childId: string, session: Session): Promise<void> {
    await ChildrenStorage.saveSessionForChildAsync(childId, session);
  },

  /**
   * Удалить сессию ребёнка.
   */
  async deleteSession(childId: string, sessionUpdatedAt: string): Promise<boolean> {
    return ChildrenStorage.deleteSessionAsync(childId, sessionUpdatedAt);
  },

  /**
   * Получить последнюю сессию ребёнка.
   */
  async getLatestSession(childId: string): Promise<Session | null> {
    const sessions = await this.getSessions(childId);
    if (sessions.length === 0) return null;

    return sessions.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )[0] ?? null;
  },

  /**
   * Получить завершённые сессии ребёнка.
   */
  async getCompletedSessions(childId: string): Promise<Session[]> {
    const sessions = await this.getSessions(childId);
    return sessions
      .filter((s): s is Session & { finalNote: string } => Boolean(s.finalNote && s.finalNote.trim()))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },

  // ========================================================================
  // Feedback & Insights
  // ========================================================================

  /**
   * Сохранить обратную связь подростка.
   */
  async saveFeedback(childId: string, feedback: AdolescentFeedback): Promise<boolean> {
    return ChildrenStorage.saveAdolescentFeedbackAsync(childId, feedback);
  },

  /**
   * Прикрепить insight истории к последней сессии ребёнка.
   */
  async attachHistoryInsight(childId: string, insight: string): Promise<boolean> {
    return ChildrenStorage.attachHistoryInsightAsync(childId, insight);
  },
};

export default DataService;
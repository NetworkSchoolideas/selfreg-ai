/**
 * DataService — единый слой данных для SelfReg AI.
 *
 * Двухуровневая архитектура:
 *   1. Supabase (если включён + аутентифицирован) — первичный источник
 *   2. localStorage — fallback (всегда доступен)
 *
 * Чтение:
 *   - Authenticated child/session reads go through protected API routes
 *   - localStorage is only used for an unauthenticated mock sandbox
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
import { isSupabaseAvailable } from "@/lib/supabase";
import { supabase } from "@/lib/supabase-auth";

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
  const prefix = "[DataService]";
  if (data instanceof Error) {
    console.error(`${prefix} ${message}`, {
      name: data.name,
      message: data.message,
      stack: data.stack,
    });
  } else if (process.env.NODE_ENV === "development") {
    console.log(`${prefix} ${message}`, data ?? "");
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
    if (!supabase) {
      return false;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    return !!user;
  } catch {
    return false;
  }
}

async function fetchAuthorizedChild(childId: string): Promise<ChildProfile | null> {
  const response = await fetch(`/api/children?childId=${encodeURIComponent(childId)}`, {
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Could not load the saved profile from the server");
  }

  const payload = await response.json();
  return payload?.child ?? null;
}

async function fetchAuthorizedChildren(teacherId?: string): Promise<ChildProfile[]> {
  const searchParams = new URLSearchParams();
  if (teacherId) {
    searchParams.set("teacherId", teacherId);
  }

  const response = await fetch(`/api/children${searchParams.size ? `?${searchParams.toString()}` : ""}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Could not load students from the server");
  }

  const payload = await response.json();
  return Array.isArray(payload?.children) ? payload.children : [];
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
    // Teacher data must be loaded through the role-protected route, never
    // through a browser import of server storage or a stale local cache.
    if (await isSupabaseReady()) {
      const children = await fetchAuthorizedChildren(teacherId);
      children.forEach((child) => ChildrenStorage.upsertLocalChild(child));
      log(`Loaded ${children.length} children from authorized API`);
      return children;
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
    // An authenticated account must use the server result. Falling back to a
    // stale browser cache can display another state after an API failure.
    if (await isSupabaseReady()) {
      const child = await fetchAuthorizedChild(childId);
      if (child) {
        ChildrenStorage.upsertLocalChild(child);
        log(`Loaded child ${childId} from authorized API`);
      }
      return child;
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
    // See getChild: authenticated session history must not silently fall back
    // to localStorage after a server failure.
    if (await isSupabaseReady()) {
      const child = await fetchAuthorizedChild(childId);
      return child?.sessions ?? [];
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

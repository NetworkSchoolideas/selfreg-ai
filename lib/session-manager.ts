import { DataService } from "@/lib/data-service";
import { ChildrenStorage } from "@/lib/children-storage";
import type { Session, RecordItem, CompletedSession } from "@/types/session";

const DEMO_SESSION_KEY = "selfreg_demo_session";

/**
 * Менеджер сессий — слой для работы с хранилищем через DataService.
 * Отвечает за:
 *  - сохранение и загрузку сессий
 *  - привязку к childId (если есть)
 *  - извлечение завершённых сессий для истории
 *
 * Все операции записи дублируются в Supabase (через DataService → ChildrenStorage).
 * Чистый слой — не зависит от React.
 */
export class SessionManager {
  /**
   * Сохраняет сессию:
   * - если есть childId → через DataService (localStorage + Supabase)
   * - иначе → в localStorage (демо-режим)
   */
  saveSession(session: Session, localStorageKey = DEMO_SESSION_KEY): void {
    if (session.childId) {
      // Fire-and-forget: DataService сам синхронизирует с Supabase
      DataService.saveSession(session.childId, session).catch(() => {
        // Ошибка логируется внутри DataService
      });
    } else {
      this.saveLocalSession(session, localStorageKey);
    }
  }

  /**
   * Stores an independent session under an explicit browser-only key.
   * It never reaches a student profile or server-backed analytics.
   */
  saveLocalSession(session: Session, localStorageKey = DEMO_SESSION_KEY): void {
    localStorage.setItem(localStorageKey, JSON.stringify(session));
  }

  /**
   * Загружает сессию:
   * - если есть childId → через DataService (Supabase → localStorage)
   * - иначе → из localStorage (демо-режим)
   */
  loadSession(childId?: string): Session | null {
    if (childId) {
      // Синхронная загрузка из localStorage (быстрый путь)
      const child = ChildrenStorage.getChild(childId);
      if (!child || child.sessions.length === 0) return null;

      // Фоновая синхронизация с Supabase (если нужно)
      DataService.getChild(childId).catch(() => {});

      return [...child.sessions].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )[0] ?? null;
    }

    return this.loadLocalSession();
  }

  loadLocalSession(localStorageKey = DEMO_SESSION_KEY): Session | null {
    try {
      const raw = localStorage.getItem(localStorageKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  /**
   * Удаляет сессию из хранилища.
   */
  deleteSession(childId?: string): void {
    if (childId) {
      // Для удаления нужно знать updatedAt сессии
      // Пока просто не делаем ничего — удаление сессий через API педагога
    } else {
      this.clearLocalSession();
    }
  }

  clearLocalSession(localStorageKey = DEMO_SESSION_KEY): void {
    localStorage.removeItem(localStorageKey);
  }

  /**
   * Возвращает все завершённые сессии для ребёнка (отсортированные: новые сверху).
   */
  getCompletedSessionsForChild(childId: string): CompletedSession[] {
    const child = ChildrenStorage.getChild(childId);
    if (!child) return [];

    return child.sessions
      .filter((s): s is CompletedSession => Boolean(s.finalNote && s.finalNote.trim()))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  /**
   * Возвращает все завершённые сессии для всех детей (для админки/педагога).
   */
  getAllCompletedSessions(): CompletedSession[] {
    const children = ChildrenStorage.getAll();
    const allSessions: CompletedSession[] = [];

    for (const child of children) {
      for (const session of child.sessions) {
        if (session.finalNote && session.finalNote.trim()) {
          allSessions.push({
            ...session,
            childId: child.id,
          });
        }
      }
    }

    return allSessions.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  /**
   * Проверяет, есть ли активная сессия (черновик или завершённая).
   */
  hasActiveSession(childId?: string): boolean {
    if (childId) {
      const child = ChildrenStorage.getChild(childId);
      return !!(child?.sessions && child.sessions.length > 0);
    }

    return localStorage.getItem(DEMO_SESSION_KEY) !== null;
  }

  /**
   * Создаёт новую пустую сессию.
   */
  createSession(context: string, lang: "ru" | "en", childId?: string): Session {
    return {
      status: "draft",
      context,
      records: [],
      finalNote: "",
      updatedAt: new Date().toISOString(),
      lang,
      childId,
    };
  }

  /**
   * Привязывает LLM-комментарий к последней сессии ребёнка.
   * Делегирует в DataService для синхронизации с Supabase.
   */
  attachHistoryInsight(childId: string, insight: string): boolean {
    // Fire-and-forget: DataService сам синхронизирует с Supabase
    DataService.attachHistoryInsight(childId, insight).catch(() => {});
    return true;
  }
}

// Singleton
export const sessionManager = new SessionManager();

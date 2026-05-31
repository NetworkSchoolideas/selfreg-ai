// === Types re-exported from @/types/session (single source of truth) ===
// Dashboard and prototype both rely on these shapes.

import type { RecordItem, Session, ChildProfile as Child, AdolescentFeedback } from "@/types/session";
import { supabase, isSupabaseAvailable } from "@/lib/supabase";

// Re-export for backward compatibility with existing imports in Dashboard etc.
export type { RecordItem, Session, Child, AdolescentFeedback };

const CHILDREN_KEY = "selfreg_children_v2";
const ENABLED_SUPABASE = typeof window !== "undefined" && 
  localStorage.getItem("supabase_enabled") !== "false" && 
  isSupabaseAvailable();

/**
 * Логгер для отладки работы хранилища
 */
const log = (message: string, data?: unknown) => {
  if (process.env.NODE_ENV === "development") {
    console.log(`[ChildrenStorage] ${message}`, data ?? "");
  }
};

/**
 * Fallback: сохранить в localStorage при сбое Supabase
 */
const fallbackToLocal = () => {
  if (typeof window !== "undefined") {
    localStorage.setItem("supabase_enabled", "false");
    console.warn("[ChildrenStorage] Fallback to localStorage enabled");
  }
};

/**
 * Вспомогательная функция: преобразование из Supabase формата в локальный Child
 */
const supabaseChildToLocal = (row: any): Child => {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sessions: row.sessions || [],
    realData: row.realData || (row.class ? { fio: row.name, klass: row.class } : undefined),
  };
};

/**
 * Вспомогательная функция: преобразование из локального Child в Supabase формат
 */
const localChildToSupabase = (child: Child): Record<string, any> => ({
  id: child.id,
  name: child.name,
  class: child.realData?.klass || "",
  created_at: child.createdAt,
  updated_at: child.updatedAt || child.createdAt,
  realData: child.realData || null,
});

/**
 * Простая абстракция над "базой детей".
 * Теперь использует Supabase как основное хранилище с fallback на localStorage.
 */
export const ChildrenStorage = {
  /**
   * Получить всех детей
   * Сначала пытается загрузить из Supabase, fallback на localStorage
   */
  getAll(): Child[] {
    if (typeof window === "undefined") return [];
    
    // Пытаемся загрузить из Supabase
    if (ENABLED_SUPABASE && supabase) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result: any = supabase
          .from("children")
          .select("*")
          .order("created_at", { ascending: false });

        if (result.data) {
          log(`Loaded ${result.data.length} children from Supabase`);
          return result.data.map(supabaseChildToLocal);
        }
      } catch (err) {
        log("Supabase getAll error, falling back to localStorage", err);
        fallbackToLocal();
      }
    }

    // Fallback на localStorage
    try {
      const raw = localStorage.getItem(CHILDREN_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  /**
   * Сохранить всех детей (для обратной совместимости)
   * В режиме Supabase это не используется напрямую
   */
  saveAll(children: Child[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(CHILDREN_KEY, JSON.stringify(children));
    log(`Saved ${children.length} children to localStorage`);
  },

  /**
   * Получить ребёнка по ID
   * Сначала Supabase, fallback на localStorage
   */
  getChild(childId: string): Child | undefined {
    if (typeof window === "undefined") return undefined;

    // Пытаемся загрузить из Supabase
    if (ENABLED_SUPABASE && supabase) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result: any = supabase
          .from("children")
          .select("*")
          .eq("id", childId)
          .single();

        if (result.data) {
          log(`Found child ${childId} in Supabase`);
          return supabaseChildToLocal(result.data);
        }
      } catch (err) {
        log("Supabase getChild error", err);
        // Продолжаем на localStorage
      }
    }

    // Fallback на localStorage
    return this.getAll().find(c => c.id === childId);
  },

  /**
   * Добавить нового ребёнка
   * Сохраняет в Supabase и localStorage
   */
  addChild(name: string): Child {
    const newChild: Child = {
      id: `child_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      name: name.trim() || "Без имени",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sessions: [],
    };

    // Всегда сохраняем в localStorage для надёжности
    const children = this.getAll();
    children.push(newChild);
    this.saveAll(children);

    // Пытаемся сохранить в Supabase (async, не блокируем)
    if (ENABLED_SUPABASE && supabase) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      (async () => {
        try {
          const childData = {
            id: newChild.id,
            name: newChild.name,
            class: "",
            created_at: newChild.createdAt,
            updated_at: newChild.updatedAt,
            realData: null,
          };
          // @ts-ignore - Supabase types require explicit casting
          const { error } = await supabase.from("children").insert([childData]);
          if (error) {
            log("Supabase addChild failed", error.message);
            fallbackToLocal();
          } else {
            log(`Added child to Supabase: ${newChild.id}`);
          }
        } catch (err) {
          log("Supabase addChild error", err);
        }
      })();
    }

    return newChild;
  },

  /**
   * Создаёт ребёнка с анонимным ID, но сохраняет реальные ФИО и класс.
   * Используется при регистрации в прототипе.
   * Сохраняет в Supabase и localStorage
   */
  addChildWithRealData(anonId: string, fio: string, klass: string): Child {
    const children = this.getAll();

    // Если такой ID уже существует — не создаём дубликат
    const existing = children.find(c => c.id === anonId);
    if (existing) {
      return existing;
    }

    const newChild: Child = {
      id: anonId,
      name: anonId, // в дашборде по умолчанию показываем ID
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sessions: [],
      realData: {
        fio: fio.trim(),
        klass: klass.trim(),
      },
    };

    // Всегда сохраняем в localStorage
    children.push(newChild);
    this.saveAll(children);

    // Пытаемся сохранить в Supabase (async, не блокируем)
    if (ENABLED_SUPABASE && supabase) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      (async () => {
        try {
          const childData = {
            id: anonId,
            name: fio,
            class: klass,
            created_at: newChild.createdAt,
            updated_at: newChild.updatedAt,
            realData: newChild.realData,
          };
          // @ts-ignore - Supabase types require explicit casting
          const { error } = await supabase.from("children").insert([childData]);
          if (error) {
            log("Supabase addChildWithRealData failed", error.message);
            fallbackToLocal();
          } else {
            log(`Added child with real data to Supabase: ${anonId}`);
          }
        } catch (err) {
          log("Supabase addChildWithRealData error", err);
        }
      })();
    }

    return newChild;
  },

  /**
   * Сохранить сессию для ребёнка
   * Сохраняет в Supabase и localStorage
   */
  saveSessionForChild(childId: string, session: Session) {
    // Сохраняем в localStorage (для обратной совместимости)
    const children = this.getAll();
    const childIndex = children.findIndex(c => c.id === childId);
    if (childIndex === -1) return;

    const existingIndex = children[childIndex].sessions.findIndex(
      s => s.updatedAt === session.updatedAt
    );

    if (existingIndex !== -1) {
      children[childIndex].sessions[existingIndex] = session;
    } else {
      children[childIndex].sessions.push(session);
    }

    children[childIndex].updatedAt = new Date().toISOString();
    this.saveAll(children);

    // Пытаемся сохранить в Supabase (async, не блокируем)
    if (ENABLED_SUPABASE && supabase) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      (async () => {
        try {
          const sessionData = {
            child_id: childId,
            context: session.context,
            final_note: session.finalNote || null,
            status: session.finalNote ? "completed" : "in_progress",
            completed_at: session.finalNote ? session.updatedAt : null,
            created_at: session.updatedAt,
            updated_at: session.updatedAt,
          };
          // @ts-ignore - Supabase types require explicit casting
          const { error } = await supabase.from("sessions").insert([sessionData]);
          if (error) {
            log("Supabase saveSession failed", error.message);
          } else {
            log("Saved session to Supabase");
          }
        } catch (err) {
          log("Supabase saveSession error", err);
        }
      })();
    }
  },

  /**
   * Получить сессии для ребёнка
   * Сначала Supabase, fallback на localStorage
   */
  getSessionsForChild(childId: string): Session[] {
    if (ENABLED_SUPABASE && supabase) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result: any = supabase
          .from("sessions")
          .select("*")
          .eq("child_id", childId)
          .order("created_at", { ascending: false });

        if (result.data) {
          log(`Loaded ${result.data.length} sessions from Supabase`);
          return result.data as Session[];
        }
      } catch (err) {
        log("Supabase getSessions error", err);
      }
    }

    return this.getChild(childId)?.sessions ?? [];
  },

  /**
   * Удалить сессию у ребёнка
   */
  deleteSession(childId: string, sessionUpdatedAt: string): boolean {
    const children = this.getAll();
    const childIndex = children.findIndex(c => c.id === childId);
    if (childIndex === -1) return false;

    const originalLength = children[childIndex].sessions.length;

    children[childIndex].sessions = children[childIndex].sessions.filter(
      s => s.updatedAt !== sessionUpdatedAt
    );

    if (children[childIndex].sessions.length === originalLength) {
      return false;
    }

    children[childIndex].updatedAt = new Date().toISOString();
    this.saveAll(children);

    // Удаление из Supabase
    if (ENABLED_SUPABASE && supabase) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result: any = supabase
          .from("sessions")
          .delete()
          .eq("child_id", childId)
          .eq("updated_at", sessionUpdatedAt);

        if (result.error) {
          log("Supabase deleteSession failed", result.error.message);
        } else {
          log("Deleted session from Supabase");
        }
      } catch (err) {
        log("Supabase deleteSession error", err);
      }
    }

    return true;
  },

  /**
   * Удалить ребёнка и все его сессии
   */
  deleteChild(childId: string): boolean {
    const children = this.getAll();
    const before = children.length;
    const filtered = children.filter(c => c.id !== childId);
    if (filtered.length === before) return false;
    this.saveAll(filtered);

    // Удаление из Supabase
    if (ENABLED_SUPABASE && supabase) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result: any = supabase
          .from("children")
          .delete()
          .eq("id", childId);

        if (result.error) {
          log("Supabase deleteChild failed", result.error.message);
        } else {
          log("Deleted child from Supabase");
        }
      } catch (err) {
        log("Supabase deleteChild error", err);
      }
    }

    return true;
  },

  /**
   * Добавить history insight к последней сессии
   */
  attachHistoryInsight(childId: string, insight: string): boolean {
    const children = this.getAll();
    const idx = children.findIndex(c => c.id === childId);
    if (idx === -1 || children[idx].sessions.length === 0) return false;

    const sorted = [...children[idx].sessions].sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    const latest = sorted[0];

    const updated = { ...latest, historyInsight: insight, updatedAt: new Date().toISOString() };
    const rest = children[idx].sessions.filter(s => s.updatedAt !== latest.updatedAt);

    children[idx].sessions = [updated, ...rest];
    children[idx].updatedAt = new Date().toISOString();
    this.saveAll(children);

    return true;
  },

  /**
   * Сохранить feedback подростка
   */
  saveAdolescentFeedback(childId: string, feedback: AdolescentFeedback): boolean {
    const children = this.getAll();
    const idx = children.findIndex(c => c.id === childId);
    if (idx === -1 || children[idx].sessions.length === 0) return false;

    const sorted = [...children[idx].sessions].sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    const latest = sorted[0];

    const updated = { ...latest, adolescentFeedback: feedback, updatedAt: new Date().toISOString() };
    const rest = children[idx].sessions.filter(s => s.updatedAt !== latest.updatedAt);

    children[idx].sessions = [updated, ...rest];
    children[idx].updatedAt = new Date().toISOString();
    this.saveAll(children);

    return true;
  },

  /**
   * Получить последнюю сессию для ребёнка
   */
  getLatestSessionForChild(childId: string): Session | null {
    const sessions = this.getSessionsForChild(childId);
    if (sessions.length === 0) return null;

    return sessions.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )[0] ?? null;
  },

  /**
   * Получить завершённые сессии для ребёнка
   */
  getCompletedSessionsForChild(childId: string): Session[] {
    const sessions = this.getSessionsForChild(childId);
    
    return sessions
      .filter((s): s is Session & { finalNote: string } => Boolean(s.finalNote && s.finalNote.trim()))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },
};

import type { RecordItem, Session, ChildProfile as Child, AdolescentFeedback } from "@/types/session";

export type { RecordItem, Session, Child, AdolescentFeedback };

const CHILDREN_KEY = "selfreg_children_v2";

const log = (message: string, data?: unknown) => {
  if (process.env.NODE_ENV === "development") {
    console.log(`[ChildrenStorage] ${message}`, data ?? "");
  }
};

interface AddChildOptions {
  teacherId?: string;
  consentGiven?: boolean;
  consentTimestamp?: string;
}

export function createChildId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return "00000000-0000-4000-8000-" + Math.random().toString(16).slice(2, 14).padEnd(12, "0");
}

function readChildren(): Child[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(CHILDREN_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeChildren(children: Child[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CHILDREN_KEY, JSON.stringify(children));
  log(`Saved ${children.length} children to localStorage`);
}

/**
 * Проверяет, доступен ли Supabase admin client (серверная сторона).
 * Используется для fire-and-forget синхронизации.
 */
function isSupabaseAvailable(): boolean {
  return (
    typeof process !== "undefined" &&
    (process.env.NEXT_PUBLIC_SUPABASE_ENABLED === "true" ||
      process.env.SUPABASE_SERVICE_ROLE_KEY !== undefined)
  );
}

/**
 * Отправляет fire-and-forget запрос к API для синхронизации с Supabase.
 */
function syncToApi(endpoint: string, body: unknown) {
  if (typeof window === "undefined") return;
  if (!isSupabaseAvailable()) return;

  void fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch((err) => log(`Sync to ${endpoint} failed`, err));
}

export const ChildrenStorage = {
  getAll(): Child[] {
    return readChildren();
  },

  saveAll(children: Child[]) {
    writeChildren(children);
  },

  upsertLocalChild(child: Child) {
    const children = readChildren();
    const index = children.findIndex((item) => item.id === child.id);

    if (index >= 0) {
      children[index] = child;
    } else {
      children.push(child);
    }

    writeChildren(children);
  },

  /**
   * Асинхронная версия upsertLocalChild — сохраняет в localStorage
   * и дублирует в Supabase через API.
   */
  async upsertLocalChildAsync(child: Child): Promise<Child> {
    this.upsertLocalChild(child);

    syncToApi("/api/children", {
      action: "upsert",
      child: {
        id: child.id,
        name: child.name,
        className: child.realData?.klass,
        teacherId: child.teacherId,
        consentGiven: child.consentGiven,
        consentTimestamp: child.consentTimestamp,
        realData: child.realData,
      },
    });

    return child;
  },

  removeLocalChild(childId: string) {
    writeChildren(readChildren().filter((item) => item.id !== childId));
  },

  getChild(childId: string): Child | undefined {
    return readChildren().find((child) => child.id === childId);
  },

  addChild(name: string): Child {
    const newChild: Child = {
      id: createChildId(),
      name: name.trim() || "Без имени",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sessions: [],
    };

    const children = readChildren();
    children.push(newChild);
    writeChildren(children);
    return newChild;
  },

  addChildWithRealData(anonId: string, fio: string, klass: string, options: AddChildOptions = {}): Child {
    const children = readChildren();
    const existing = children.find((child) => child.id === anonId);
    if (existing) {
      return existing;
    }

    const newChild: Child = {
      id: anonId,
      name: anonId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sessions: [],
      realData: {
        fio: fio.trim(),
        klass: klass.trim(),
      },
      teacherId: options.teacherId,
      consentGiven: options.consentGiven,
      consentTimestamp: options.consentTimestamp,
    };

    children.push(newChild);
    writeChildren(children);
    return newChild;
  },

  saveSessionForChild(childId: string, session: Session) {
    const children = readChildren();
    const childIndex = children.findIndex((child) => child.id === childId);
    if (childIndex === -1) return;

    const existingIndex = children[childIndex].sessions.findIndex((storedSession) => {
      if (session.sessionId && storedSession.sessionId) {
        return storedSession.sessionId === session.sessionId;
      }

      return storedSession.updatedAt === session.updatedAt;
    });

    if (existingIndex !== -1) {
      children[childIndex].sessions[existingIndex] = session;
    } else {
      children[childIndex].sessions.push(session);
    }

    children[childIndex].updatedAt = new Date().toISOString();
    writeChildren(children);
  },

  /**
   * Асинхронная версия saveSessionForChild — сохраняет в localStorage
   * и дублирует в Supabase через API.
   */
  async saveSessionForChildAsync(childId: string, session: Session): Promise<void> {
    this.saveSessionForChild(childId, session);

    syncToApi("/api/session-sync", { childId, session });
  },

  getSessionsForChild(childId: string): Session[] {
    return this.getChild(childId)?.sessions ?? [];
  },

  deleteSession(childId: string, sessionUpdatedAt: string): boolean {
    const children = readChildren();
    const childIndex = children.findIndex((child) => child.id === childId);
    if (childIndex === -1) return false;

    const originalLength = children[childIndex].sessions.length;
    children[childIndex].sessions = children[childIndex].sessions.filter(
      (session) => session.updatedAt !== sessionUpdatedAt
    );

    if (children[childIndex].sessions.length === originalLength) {
      return false;
    }

    children[childIndex].updatedAt = new Date().toISOString();
    writeChildren(children);
    return true;
  },

  /**
   * Асинхронная версия deleteSession — удаляет из localStorage
   * и дублирует удаление в Supabase через API.
   */
  async deleteSessionAsync(childId: string, sessionUpdatedAt: string): Promise<boolean> {
    const removed = this.deleteSession(childId, sessionUpdatedAt);

    if (removed) {
      syncToApi("/api/session-sync", {
        action: "delete",
        childId,
        sessionUpdatedAt,
      });
    }

    return removed;
  },

  deleteChild(childId: string): boolean {
    const children = readChildren();
    const filtered = children.filter((child) => child.id !== childId);
    if (filtered.length === children.length) return false;

    writeChildren(filtered);
    return true;
  },

  /**
   * Асинхронная версия deleteChild — удаляет из localStorage
   * и дублирует удаление в Supabase через API.
   */
  async deleteChildAsync(childId: string): Promise<boolean> {
    const removed = this.deleteChild(childId);

    if (removed) {
      syncToApi("/api/children", { action: "delete", childId });
    }

    return removed;
  },

  attachHistoryInsight(childId: string, insight: string): boolean {
    const children = readChildren();
    const index = children.findIndex((child) => child.id === childId);
    if (index === -1 || children[index].sessions.length === 0) return false;

    const sorted = [...children[index].sessions].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    const latest = sorted[0];
    const updated = { ...latest, historyInsight: insight, updatedAt: new Date().toISOString() };
    const rest = children[index].sessions.filter((session) => session.updatedAt !== latest.updatedAt);

    children[index].sessions = [updated, ...rest];
    children[index].updatedAt = new Date().toISOString();
    writeChildren(children);

    syncToApi("/api/session-feedback", { childId, historyInsight: insight });

    return true;
  },

  /**
   * Асинхронная версия attachHistoryInsight.
   */
  async attachHistoryInsightAsync(childId: string, insight: string): Promise<boolean> {
    return this.attachHistoryInsight(childId, insight);
  },

  saveAdolescentFeedback(childId: string, feedback: AdolescentFeedback): boolean {
    const children = readChildren();
    const index = children.findIndex((child) => child.id === childId);
    if (index === -1 || children[index].sessions.length === 0) return false;

    const sorted = [...children[index].sessions].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    const latest = sorted[0];
    const updated = { ...latest, adolescentFeedback: feedback, updatedAt: new Date().toISOString() };
    const rest = children[index].sessions.filter((session) => session.updatedAt !== latest.updatedAt);

    children[index].sessions = [updated, ...rest];
    children[index].updatedAt = new Date().toISOString();
    writeChildren(children);

    syncToApi("/api/session-feedback", { childId, adolescentFeedback: feedback });

    return true;
  },

  /**
   * Асинхронная версия saveAdolescentFeedback.
   */
  async saveAdolescentFeedbackAsync(childId: string, feedback: AdolescentFeedback): Promise<boolean> {
    return this.saveAdolescentFeedback(childId, feedback);
  },

  getLatestSessionForChild(childId: string): Session | null {
    const sessions = this.getSessionsForChild(childId);
    if (sessions.length === 0) return null;

    return (
      sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0] ??
      null
    );
  },

  getCompletedSessionsForChild(childId: string): Session[] {
    const sessions = this.getSessionsForChild(childId);

    return sessions
      .filter((session): session is Session & { finalNote: string } => Boolean(session.finalNote && session.finalNote.trim()))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },
};

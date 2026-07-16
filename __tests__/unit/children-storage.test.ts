import { ChildrenStorage } from "@/lib/children-storage";
import type { AdolescentFeedback, ChildProfile, Session } from "@/types/session";

function installBrowserStorageMock() {
  const store = new Map<string, string>();
  const localStorageMock = {
    getItem: jest.fn((key: string) => store.get(key) ?? null),
    setItem: jest.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: jest.fn((key: string) => {
      store.delete(key);
    }),
    clear: jest.fn(() => {
      store.clear();
    }),
  };

  Object.defineProperty(global, "localStorage", {
    value: localStorageMock,
    configurable: true,
  });
  Object.defineProperty(global, "window", {
    value: { localStorage: localStorageMock },
    configurable: true,
  });
}

function makeSession(updatedAt: string, finalNote = ""): Session {
  return {
    sessionId: `session-${updatedAt}`,
    context: "exam",
    records: [],
    finalNote,
    updatedAt,
    lang: "en",
  };
}

describe("ChildrenStorage", () => {
  const originalSupabaseEnabled = process.env.NEXT_PUBLIC_SUPABASE_ENABLED;

  beforeEach(() => {
    installBrowserStorageMock();
    jest.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true })));
  });

  afterEach(() => {
    if (originalSupabaseEnabled === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_ENABLED;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_ENABLED = originalSupabaseEnabled;
    }
    jest.restoreAllMocks();
  });

  it("creates a child with a unique id and empty sessions", () => {
    const child = ChildrenStorage.addChild("Test Student");

    expect(child.id).toEqual(expect.any(String));
    expect(child.name).toBe("Test Student");
    expect(child.sessions).toEqual([]);
    expect(ChildrenStorage.getChild(child.id)).toEqual(child);
  });

  it("saves a session for a child", () => {
    const child = ChildrenStorage.addChild("Test Student");
    const session = makeSession("2026-01-01T00:00:00.000Z", "done");

    ChildrenStorage.saveSessionForChild(child.id, session);

    expect(ChildrenStorage.getSessionsForChild(child.id)).toEqual([session]);
  });

  it("returns only completed sessions sorted newest first", () => {
    const child = ChildrenStorage.addChild("Test Student");
    ChildrenStorage.saveSessionForChild(child.id, makeSession("2026-01-01T00:00:00.000Z", "older"));
    ChildrenStorage.saveSessionForChild(child.id, makeSession("2026-01-03T00:00:00.000Z"));
    ChildrenStorage.saveSessionForChild(child.id, makeSession("2026-01-02T00:00:00.000Z", "newer"));

    expect(ChildrenStorage.getCompletedSessionsForChild(child.id).map((session) => session.finalNote)).toEqual([
      "newer",
      "older",
    ]);
  });

  it("deletes a child and its sessions", () => {
    const child = ChildrenStorage.addChild("Test Student");
    ChildrenStorage.saveSessionForChild(child.id, makeSession("2026-01-01T00:00:00.000Z", "done"));

    expect(ChildrenStorage.deleteChild(child.id)).toBe(true);

    expect(ChildrenStorage.getChild(child.id)).toBeUndefined();
    expect(ChildrenStorage.getSessionsForChild(child.id)).toEqual([]);
  });

  it("attaches a history insight to the latest session", () => {
    const child = ChildrenStorage.addChild("Test Student");
    ChildrenStorage.saveSessionForChild(child.id, makeSession("2026-01-01T00:00:00.000Z", "older"));
    ChildrenStorage.saveSessionForChild(child.id, makeSession("2026-01-02T00:00:00.000Z", "newer"));

    expect(ChildrenStorage.attachHistoryInsight(child.id, "Keep going")).toBe(true);

    const latest = ChildrenStorage.getLatestSessionForChild(child.id);
    expect(latest?.historyInsight).toBe("Keep going");
  });

  it("saves adolescent feedback on the completed session that requested it", () => {
    const child = ChildrenStorage.addChild("Test Student");
    const feedback: AdolescentFeedback = {
      rating: 5,
      comment: "Useful",
      timestamp: "2026-01-01T00:00:00.000Z",
    };
    const completed = { ...makeSession("2026-01-01T00:00:00.000Z", "done"), status: "completed" as const };
    const active = { ...makeSession("2026-01-02T00:00:00.000Z"), status: "in_progress" as const };
    ChildrenStorage.saveSessionForChild(child.id, completed);
    ChildrenStorage.saveSessionForChild(child.id, active);

    expect(ChildrenStorage.saveAdolescentFeedback(child.id, feedback, completed.sessionId)).toBe(true);

    const sessions = ChildrenStorage.getSessionsForChild(child.id);
    expect(sessions.find((session) => session.sessionId === completed.sessionId)?.adolescentFeedback).toEqual(feedback);
    expect(sessions.find((session) => session.sessionId === active.sessionId)?.adolescentFeedback).toBeUndefined();
  });

  it("persists feedback through the API before updating a server-backed child", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_ENABLED = "true";
    const feedback: AdolescentFeedback = {
      rating: 5,
      comment: "Useful",
      timestamp: "2026-01-01T00:00:00.000Z",
    };
    const child: ChildProfile = {
      id: "server-feedback-child",
      name: "Student",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      sessions: [makeSession("2026-01-01T00:00:00.000Z", "done")],
      realData: { fio: "Student", klass: "10A" },
    };
    ChildrenStorage.upsertLocalChild(child);

    const sessionId = child.sessions[0].sessionId;
    await expect(ChildrenStorage.saveAdolescentFeedbackAsync(child.id, feedback, sessionId)).resolves.toBe(true);

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/session-feedback",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ childId: child.id, adolescentFeedback: feedback, sessionId }),
      }),
    );
    expect(ChildrenStorage.getLatestSessionForChild(child.id)?.adolescentFeedback).toEqual(feedback);
  });

  it("upserts an existing child instead of duplicating it", () => {
    const child = ChildrenStorage.addChild("Test Student");
    const updated: ChildProfile = {
      ...child,
      name: "Updated Student",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    ChildrenStorage.upsertLocalChild(updated);

    expect(ChildrenStorage.getAll()).toHaveLength(1);
    expect(ChildrenStorage.getChild(child.id)?.name).toBe("Updated Student");
  });

  it("does not report a server-backed session as saved when sync fails", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_ENABLED = "true";
    const child: ChildProfile = {
      id: "server-child",
      name: "Student",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      sessions: [],
      realData: { fio: "Student", klass: "10A" },
    };
    ChildrenStorage.upsertLocalChild(child);
    jest.spyOn(global, "fetch").mockResolvedValue(new Response("save failed", { status: 500 }));

    await expect(
      ChildrenStorage.saveSessionForChildAsync(child.id, makeSession("2026-01-02T00:00:00.000Z", "done"))
    ).rejects.toThrow("The server could not save changes");

    expect(ChildrenStorage.getSessionsForChild(child.id)).toEqual([]);
  });
});

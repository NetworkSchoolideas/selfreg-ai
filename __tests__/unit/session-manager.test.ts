import type { ChildProfile, Session } from "@/types/session";

const mockGetChild = jest.fn();
const mockSaveSession = jest.fn();
const mockGetChildFromDataService = jest.fn();

jest.mock("@/lib/children-storage", () => ({
  ChildrenStorage: {
    getChild: mockGetChild,
    getAll: jest.fn(() => []),
  },
}));

jest.mock("@/lib/data-service", () => ({
  DataService: {
    saveSession: mockSaveSession,
    getChild: mockGetChildFromDataService,
    attachHistoryInsight: jest.fn(() => Promise.resolve(true)),
  },
}));

import { SessionManager } from "@/lib/session-manager";

function installLocalStorageMock() {
  const store = new Map<string, string>();
  Object.defineProperty(global, "localStorage", {
    value: {
      getItem: jest.fn((key: string) => store.get(key) ?? null),
      setItem: jest.fn((key: string, value: string) => {
        store.set(key, value);
      }),
      removeItem: jest.fn((key: string) => {
        store.delete(key);
      }),
    },
    configurable: true,
  });
}

function makeSession(updatedAt: string, finalNote = ""): Session {
  return {
    context: "exam",
    records: [],
    finalNote,
    updatedAt,
    lang: "en",
  };
}

describe("SessionManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    installLocalStorageMock();
  });

  it("saves and loads a demo session from localStorage", () => {
    const manager = new SessionManager();
    const session = manager.createSession("exam", "en");

    manager.saveSession(session);

    expect(manager.loadSession()).toEqual(session);
    expect(mockSaveSession).not.toHaveBeenCalled();
  });

  it("returns completed child sessions sorted newest first", () => {
    const child: ChildProfile = {
      id: "child-1",
      name: "Student",
      createdAt: "2026-01-01T00:00:00.000Z",
      sessions: [
        makeSession("2026-01-01T00:00:00.000Z", "older"),
        makeSession("2026-01-03T00:00:00.000Z"),
        makeSession("2026-01-02T00:00:00.000Z", "newer"),
      ],
    };
    mockGetChild.mockReturnValue(child);

    const result = new SessionManager().getCompletedSessionsForChild("child-1");

    expect(result.map((session) => session.finalNote)).toEqual(["newer", "older"]);
  });

  it("deletes the demo session from localStorage", () => {
    const manager = new SessionManager();
    manager.saveSession(makeSession("2026-01-01T00:00:00.000Z"));

    manager.deleteSession();

    expect(manager.loadSession()).toBeNull();
  });

  it("keeps an independent local session separate from the default demo session", () => {
    const manager = new SessionManager();
    const personalKey = "selfreg_personal_session:teacher-1";
    const session = makeSession("2026-01-04T00:00:00.000Z", "personal");

    manager.saveLocalSession(session, personalKey);

    expect(manager.loadLocalSession(personalKey)).toEqual(session);
    expect(manager.loadSession()).toBeNull();

    manager.clearLocalSession(personalKey);
    expect(manager.loadLocalSession(personalKey)).toBeNull();
  });
});

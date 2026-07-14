const mockGetUser = jest.fn();
const mockUpsertLocalChild = jest.fn();
const mockGetChild = jest.fn();

jest.mock("@/lib/supabase", () => ({
  isSupabaseAvailable: jest.fn(() => true),
}));

jest.mock("@/lib/supabase-auth", () => ({
  supabase: {
    auth: {
      getUser: mockGetUser,
    },
  },
}));

jest.mock("@/lib/children-storage", () => ({
  ChildrenStorage: {
    upsertLocalChild: mockUpsertLocalChild,
    getChild: mockGetChild,
    getAll: jest.fn(() => []),
    getSessionsForChild: jest.fn(() => []),
  },
}));

import { DataService } from "@/lib/data-service";

describe("DataService authenticated reads", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "student-1" } } });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("uses the protected API result instead of a stale local profile", async () => {
    const serverChild = {
      id: "child-1",
      name: "Server student",
      createdAt: "2026-07-14T00:00:00.000Z",
      updatedAt: "2026-07-14T00:00:00.000Z",
      sessions: [],
    };
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true, child: serverChild }), { status: 200 })
    );
    mockGetChild.mockReturnValue({ ...serverChild, name: "Stale local student" });

    await expect(DataService.getChild("child-1")).resolves.toEqual(serverChild);

    expect(global.fetch).toHaveBeenCalledWith("/api/children?childId=child-1", { cache: "no-store" });
    expect(mockUpsertLocalChild).toHaveBeenCalledWith(serverChild);
    expect(mockGetChild).not.toHaveBeenCalled();
  });

  it("surfaces a server failure instead of reporting stale local sessions", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(new Response("failed", { status: 500 }));

    await expect(DataService.getSessions("child-1")).rejects.toThrow(
      "Could not load the saved profile from the server"
    );
  });

  it("loads the teacher list from the protected API instead of localStorage", async () => {
    const serverChild = {
      id: "child-2",
      name: "Linked student",
      createdAt: "2026-07-14T00:00:00.000Z",
      updatedAt: "2026-07-14T00:00:00.000Z",
      sessions: [],
      teacherId: "teacher-1",
    };
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true, children: [serverChild] }), { status: 200 })
    );

    await expect(DataService.getChildren("teacher-1")).resolves.toEqual([serverChild]);

    expect(global.fetch).toHaveBeenCalledWith("/api/children?teacherId=teacher-1", { cache: "no-store" });
    expect(mockUpsertLocalChild).toHaveBeenCalledWith(serverChild);
  });
});

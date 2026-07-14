const getSupabaseAdminMock = jest.fn();
const isSupabaseAdminAvailableMock = jest.fn();
const requireChildOwnerMock = jest.fn();

jest.mock("@/lib/supabase", () => ({
  getSupabaseAdmin: () => getSupabaseAdminMock(),
  isSupabaseAdminAvailable: () => isSupabaseAdminAvailableMock(),
}));

jest.mock("@/lib/server-user-access", () => ({
  requireChildOwner: (childId: string) => requireChildOwnerMock(childId),
}));

describe("session sync route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isSupabaseAdminAvailableMock.mockReturnValue(true);
    requireChildOwnerMock.mockResolvedValue({
      context: { childId: "child-1", accessKind: "owner" },
    });
  });

  it("rejects an anonymous write before using the service-role client", async () => {
    requireChildOwnerMock.mockResolvedValue({
      response: Response.json({ error: "Authentication required", code: "AUTH_REQUIRED" }, { status: 401 }),
    });
    const { POST } = await import("@/app/api/session-sync/route");

    const response = await POST(
      new Request("https://selfreg.ai/api/session-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          childId: "child-1",
          sessionUpdatedAt: "2026-01-01T10:00:00.000Z",
        }),
      }),
    );

    expect(response.status).toBe(401);
    expect(getSupabaseAdminMock).not.toHaveBeenCalled();
  });

  it("deletes a synced session by childId and updatedAt", async () => {
    const sessionMaybeSingle = jest.fn().mockResolvedValue({
      data: { id: "session-1" },
      error: null,
    });
    const sessionDeleteEq = jest.fn().mockResolvedValue({ error: null });
    const childTouchEq = jest.fn().mockResolvedValue({ error: null });
    const recordsDeleteEq = jest.fn().mockResolvedValue({ error: null });

    const sessionsSelectEqUpdatedAt = jest.fn().mockReturnValue({ maybeSingle: sessionMaybeSingle });
    const sessionsSelectEqChildId = jest.fn().mockReturnValue({ eq: sessionsSelectEqUpdatedAt });
    const sessionsSelect = jest.fn().mockReturnValue({ eq: sessionsSelectEqChildId });

    const sessionsDeleteEqId = jest.fn().mockReturnValue({ eq: sessionDeleteEq });
    const sessionsDelete = jest.fn().mockReturnValue({ eq: sessionsDeleteEqId });

    const childrenUpdateEq = jest.fn().mockReturnValue({ eq: childTouchEq });
    const childrenUpdate = jest.fn().mockReturnValue({ eq: childrenUpdateEq });

    const sessionRecordsDeleteEqSessionId = jest.fn().mockReturnValue({ eq: recordsDeleteEq });
    const sessionRecordsDelete = jest.fn().mockReturnValue({ eq: sessionRecordsDeleteEqSessionId });

    const from = jest.fn().mockImplementation((table: string) => {
      if (table === "sessions") {
        return {
          select: sessionsSelect,
          delete: sessionsDelete,
        };
      }

      if (table === "children") {
        return {
          update: childrenUpdate,
        };
      }

      if (table === "session_records") {
        return {
          delete: sessionRecordsDelete,
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    getSupabaseAdminMock.mockReturnValue({ from });

    const { POST } = await import("@/app/api/session-sync/route");

    const response = await POST(
      new Request("https://selfreg.ai/api/session-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          childId: "child-1",
          sessionUpdatedAt: "2026-01-01T10:00:00.000Z",
        }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      deleted: true,
      sessionId: "session-1",
    });

    expect(sessionsSelect).toHaveBeenCalledWith("id");
    expect(sessionsSelectEqChildId).toHaveBeenCalledWith("child_id", "child-1");
    expect(sessionsSelectEqUpdatedAt).toHaveBeenCalledWith("updated_at", "2026-01-01T10:00:00.000Z");
    expect(requireChildOwnerMock).toHaveBeenCalledWith("child-1");
    expect(sessionRecordsDelete).toHaveBeenCalled();
    expect(sessionsDelete).toHaveBeenCalled();
    expect(childrenUpdate).toHaveBeenCalledWith({ updated_at: expect.any(String) });
  });
});

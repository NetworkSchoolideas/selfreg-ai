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

describe("session feedback route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isSupabaseAdminAvailableMock.mockReturnValue(true);
    requireChildOwnerMock.mockResolvedValue({
      context: { childId: "child-1", accessKind: "owner" },
    });
  });

  it("rejects a linked teacher before querying a student's completed sessions", async () => {
    requireChildOwnerMock.mockResolvedValue({
      response: Response.json({ error: "Child write access denied", code: "CHILD_WRITE_DENIED" }, { status: 403 }),
    });
    const { POST } = await import("@/app/api/session-feedback/route");

    const response = await POST(
      new Request("https://selfreg.ai/api/session-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId: "child-1", historyInsight: "Insight" }),
      }),
    );

    expect(response.status).toBe(403);
    expect(getSupabaseAdminMock).not.toHaveBeenCalled();
  });

  it("updates feedback only after owner access succeeds", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: { id: "session-1" }, error: null });
    const limit = jest.fn().mockReturnValue({ maybeSingle });
    const order = jest.fn().mockReturnValue({ limit });
    const statusEq = jest.fn().mockReturnValue({ order });
    const childEq = jest.fn().mockReturnValue({ eq: statusEq });
    const select = jest.fn().mockReturnValue({ eq: childEq });
    const updateEq = jest.fn().mockResolvedValue({ error: null });
    const update = jest.fn().mockReturnValue({ eq: updateEq });
    const childTouchEq = jest.fn().mockResolvedValue({ error: null });
    const childrenUpdate = jest.fn().mockReturnValue({ eq: childTouchEq });
    const from = jest.fn().mockImplementation((table: string) => {
      if (table === "sessions") return { select, update };
      if (table === "children") return { update: childrenUpdate };
      throw new Error(`Unexpected table: ${table}`);
    });
    getSupabaseAdminMock.mockReturnValue({ from });
    const { POST } = await import("@/app/api/session-feedback/route");

    const response = await POST(
      new Request("https://selfreg.ai/api/session-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId: "child-1",
          adolescentFeedback: { rating: 5, comment: "Useful", timestamp: "2026-01-01T10:00:00.000Z" },
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, sessionId: "session-1" });
    expect(requireChildOwnerMock).toHaveBeenCalledWith("child-1");
    expect(childEq).toHaveBeenCalledWith("child_id", "child-1");
    expect(statusEq).toHaveBeenCalledWith("status", "completed");
    expect(update).toHaveBeenCalledWith({
      adolescent_feedback: { rating: 5, comment: "Useful", timestamp: "2026-01-01T10:00:00.000Z" },
    });
  });
});

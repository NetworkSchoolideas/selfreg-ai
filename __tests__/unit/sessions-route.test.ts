import { DELETE, GET } from "@/app/api/sessions/route";
import { requireChildAccess, requireChildOwner } from "@/lib/server-user-access";
import { getSupabaseAdmin, isSupabaseAdminAvailable } from "@/lib/supabase";

jest.mock("@/lib/server-user-access", () => ({
  requireChildAccess: jest.fn(),
  requireChildOwner: jest.fn(),
}));

jest.mock("@/lib/supabase", () => ({
  getSupabaseAdmin: jest.fn(),
  isSupabaseAdminAvailable: jest.fn(),
}));

describe("sessions route access", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isSupabaseAdminAvailable as jest.Mock).mockReturnValue(true);
  });

  it("rejects an anonymous request before querying with service role", async () => {
    (requireChildAccess as jest.Mock).mockResolvedValue({
      response: Response.json({ error: "Authentication required", code: "AUTH_REQUIRED" }, { status: 401 }),
    });

    const response = await GET(new Request("https://selfreg.ai/api/sessions?childId=child-1"));

    expect(response.status).toBe(401);
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("loads sessions only after linked-child access succeeds", async () => {
    (requireChildAccess as jest.Mock).mockResolvedValue({
      context: {
        userId: "teacher-1",
        role: "teacher",
        email: "teacher@example.com",
        fullName: "Teacher",
        childId: "child-1",
        accessKind: "linked-teacher",
      },
    });

    const maybeSingle = jest.fn().mockResolvedValue({
      data: {
        id: "child-1",
        sessions: [
          { id: "older", updated_at: "2026-07-01T00:00:00.000Z" },
          { id: "newer", updated_at: "2026-07-02T00:00:00.000Z" },
        ],
      },
      error: null,
    });
    const eq = jest.fn().mockReturnValue({ maybeSingle });
    const select = jest.fn().mockReturnValue({ eq });
    const from = jest.fn().mockReturnValue({ select });
    (getSupabaseAdmin as jest.Mock).mockReturnValue({ from });

    const response = await GET(new Request("https://selfreg.ai/api/sessions?childId=child-1"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      sessions: [
        { id: "newer", updated_at: "2026-07-02T00:00:00.000Z" },
        { id: "older", updated_at: "2026-07-01T00:00:00.000Z" },
      ],
    });
    expect(requireChildAccess).toHaveBeenCalledWith("child-1");
    expect(from).toHaveBeenCalledWith("children");
  });

  it("does not disclose sessions when the child access helper returns not found", async () => {
    (requireChildAccess as jest.Mock).mockResolvedValue({
      response: Response.json({ error: "Child not found", code: "CHILD_NOT_FOUND" }, { status: 404 }),
    });

    const response = await GET(new Request("https://selfreg.ai/api/sessions?childId=missing-child"));

    expect(response.status).toBe(404);
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("rejects teacher deletion before using the service-role client", async () => {
    (requireChildOwner as jest.Mock).mockResolvedValue({
      response: Response.json({ error: "Child write access denied", code: "CHILD_WRITE_DENIED" }, { status: 403 }),
    });

    const response = await DELETE(new Request("https://selfreg.ai/api/sessions?childId=child-1&sessionId=session-1", {
      method: "DELETE",
    }));

    expect(response.status).toBe(403);
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("verifies the session belongs to the owned child before deleting it", async () => {
    (requireChildOwner as jest.Mock).mockResolvedValue({
      context: { childId: "child-1", accessKind: "owner" },
    });
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const childEq = jest.fn().mockReturnValue({ maybeSingle });
    const sessionEq = jest.fn().mockReturnValue({ eq: childEq });
    const select = jest.fn().mockReturnValue({ eq: sessionEq });
    const recordsDelete = jest.fn();
    const sessionDelete = jest.fn();
    const from = jest.fn().mockImplementation((table: string) => {
      if (table === "sessions") return { select, delete: sessionDelete };
      if (table === "session_records") return { delete: recordsDelete };
      return { update: jest.fn() };
    });
    (getSupabaseAdmin as jest.Mock).mockReturnValue({ from });

    const response = await DELETE(new Request("https://selfreg.ai/api/sessions?childId=child-1&sessionId=foreign-session", {
      method: "DELETE",
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Session not found", code: "SESSION_NOT_FOUND" });
    expect(requireChildOwner).toHaveBeenCalledWith("child-1");
    expect(sessionEq).toHaveBeenCalledWith("id", "foreign-session");
    expect(childEq).toHaveBeenCalledWith("child_id", "child-1");
    expect(recordsDelete).not.toHaveBeenCalled();
    expect(sessionDelete).not.toHaveBeenCalled();
  });
});

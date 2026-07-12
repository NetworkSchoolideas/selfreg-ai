import { GET } from "@/app/api/sessions/route";
import { requireChildAccess } from "@/lib/server-user-access";
import { getSupabaseAdmin, isSupabaseAdminAvailable } from "@/lib/supabase";

jest.mock("@/lib/server-user-access", () => ({
  requireChildAccess: jest.fn(),
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
});

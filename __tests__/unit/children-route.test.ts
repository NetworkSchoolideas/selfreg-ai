import { GET, POST } from "@/app/api/children/route";
import { fetchChildByUserIdFromSupabase, fetchChildrenFromSupabase, upsertChildInSupabase } from "@/lib/server-storage";
import { requireTeacherAccess } from "@/lib/server-teacher-access";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

jest.mock("@/lib/server-storage", () => ({
  fetchChildByUserIdFromSupabase: jest.fn(),
  fetchChildFromSupabase: jest.fn(),
  fetchChildrenFromSupabase: jest.fn(),
  upsertChildInSupabase: jest.fn(),
  deleteChildFromSupabase: jest.fn(),
}));

jest.mock("@/lib/server-teacher-access", () => ({
  requireTeacherAccess: jest.fn(),
}));

jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(),
}));

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

describe("children route teacher access", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    (cookies as jest.Mock).mockResolvedValue({
      getAll: () => [],
    });
  });

  it("resolves childId=current through the authenticated user id", async () => {
    (createServerClient as jest.Mock).mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "student-auth-1" } },
        }),
      },
    });
    (fetchChildByUserIdFromSupabase as jest.Mock).mockResolvedValue({
      id: "child-1",
      name: "Student",
    });

    const response = await GET(new Request("https://selfreg.ai/api/children?childId=current"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      child: {
        id: "child-1",
        name: "Student",
      },
    });
    expect(fetchChildByUserIdFromSupabase).toHaveBeenCalledWith("student-auth-1");
  });

  it("rejects unauthenticated list requests without teacherId", async () => {
    (requireTeacherAccess as jest.Mock).mockResolvedValue({
      response: Response.json(
        { error: "Teacher authentication required", code: "TEACHER_AUTH_REQUIRED" },
        { status: 401 }
      ),
    });

    const response = await GET(new Request("https://selfreg.ai/api/children"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Teacher authentication required",
      code: "TEACHER_AUTH_REQUIRED",
    });
    expect(requireTeacherAccess).toHaveBeenCalledWith(undefined);
    expect(fetchChildrenFromSupabase).not.toHaveBeenCalled();
  });

  it("loads children for the authenticated teacher when teacherId is omitted", async () => {
    (requireTeacherAccess as jest.Mock).mockResolvedValue({ teacherId: "teacher-auth-1" });
    (fetchChildrenFromSupabase as jest.Mock).mockResolvedValue([{ id: "child-1" }]);

    const response = await GET(new Request("https://selfreg.ai/api/children"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      children: [{ id: "child-1" }],
    });
    expect(fetchChildrenFromSupabase).toHaveBeenCalledWith("teacher-auth-1");
  });

  it("rejects unauthenticated child writes without teacherId", async () => {
    (requireTeacherAccess as jest.Mock).mockResolvedValue({
      response: Response.json(
        { error: "Teacher authentication required", code: "TEACHER_AUTH_REQUIRED" },
        { status: 401 }
      ),
    });

    const response = await POST(
      new Request("https://selfreg.ai/api/children", {
        method: "POST",
        body: JSON.stringify({ name: "Student" }),
      })
    );

    expect(response.status).toBe(401);
    expect(upsertChildInSupabase).not.toHaveBeenCalled();
  });

  it("assigns child writes without teacherId to the authenticated teacher", async () => {
    (requireTeacherAccess as jest.Mock).mockResolvedValue({ teacherId: "teacher-auth-1" });
    (upsertChildInSupabase as jest.Mock).mockResolvedValue({
      id: "child-1",
      name: "Student",
      teacherId: "teacher-auth-1",
    });

    const response = await POST(
      new Request("https://selfreg.ai/api/children", {
        method: "POST",
        body: JSON.stringify({ name: "Student" }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      child: {
        id: "child-1",
        name: "Student",
        teacherId: "teacher-auth-1",
      },
    });
    expect(upsertChildInSupabase).toHaveBeenCalledWith({
      name: "Student",
      teacherId: "teacher-auth-1",
    });
  });
});

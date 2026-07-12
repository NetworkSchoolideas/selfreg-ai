import { GET } from "@/app/api/teacher-data/route";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { computeTeacherAnalytics, fetchChildrenFromSupabase } from "@/lib/server-storage";

jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(),
}));

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

jest.mock("@/lib/server-storage", () => ({
  fetchChildrenFromSupabase: jest.fn(),
  computeTeacherAnalytics: jest.fn(),
}));

describe("teacher data route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    (cookies as jest.Mock).mockResolvedValue({
      getAll: () => [],
    });
  });

  it("rejects unauthenticated access when teacherId query param is missing", async () => {
    (createServerClient as jest.Mock).mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
        }),
      },
    });

    const response = await GET(
      new Request("https://selfreg.ai/api/teacher-data?analytics=true")
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Teacher authentication required",
      code: "TEACHER_AUTH_REQUIRED",
    });
    expect(fetchChildrenFromSupabase).not.toHaveBeenCalled();
    expect(computeTeacherAnalytics).not.toHaveBeenCalled();
  });

  it("falls back to the authenticated teacher when teacherId query param is missing", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: { role: "teacher" },
    });
    const eq = jest.fn().mockReturnValue({ maybeSingle });
    const select = jest.fn().mockReturnValue({ eq });
    const from = jest.fn().mockReturnValue({ select });

    (createServerClient as jest.Mock).mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "teacher-auth-1" } },
        }),
      },
      from,
    });

    (fetchChildrenFromSupabase as jest.Mock).mockResolvedValue([{ id: "child-1" }]);
    (computeTeacherAnalytics as jest.Mock).mockResolvedValue({ totalChildren: 1 });

    const response = await GET(
      new Request("https://selfreg.ai/api/teacher-data?analytics=true")
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      children: [{ id: "child-1" }],
      analytics: { totalChildren: 1 },
    });

    expect(from).toHaveBeenCalledWith("profiles");
    expect(select).toHaveBeenCalledWith("role, email, full_name");
    expect(eq).toHaveBeenCalledWith("id", "teacher-auth-1");
    expect(fetchChildrenFromSupabase).toHaveBeenCalledWith("teacher-auth-1");
    expect(computeTeacherAnalytics).toHaveBeenCalledWith("teacher-auth-1");
  });

  it("rejects teacherId query access for another teacher", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: { role: "teacher" },
    });
    const eq = jest.fn().mockReturnValue({ maybeSingle });
    const select = jest.fn().mockReturnValue({ eq });
    const from = jest.fn().mockReturnValue({ select });

    (createServerClient as jest.Mock).mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "teacher-auth-1" } },
        }),
      },
      from,
    });

    const response = await GET(
      new Request("https://selfreg.ai/api/teacher-data?teacherId=teacher-auth-2&analytics=true")
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Teacher access denied",
      code: "TEACHER_ACCESS_DENIED",
    });
    expect(fetchChildrenFromSupabase).not.toHaveBeenCalled();
    expect(computeTeacherAnalytics).not.toHaveBeenCalled();
  });
});

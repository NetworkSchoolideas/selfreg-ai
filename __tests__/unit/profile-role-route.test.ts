const createServerClientMock = jest.fn();
const cookiesMock = jest.fn();
const ensureStudentChildMock = jest.fn();

jest.mock("@supabase/ssr", () => ({ createServerClient: (...args: unknown[]) => createServerClientMock(...args) }));
jest.mock("next/headers", () => ({ cookies: () => cookiesMock() }));
jest.mock("@/lib/server-storage", () => ({
  ensureStudentChildForAuthUserInSupabase: (...args: unknown[]) => ensureStudentChildMock(...args),
}));

function buildClient(existingProfile: { role: string; metadata: unknown } | null) {
  const maybeSingle = jest.fn().mockResolvedValue({ data: existingProfile, error: null });
  const eq = jest.fn().mockReturnValue({ maybeSingle });
  const select = jest.fn().mockReturnValue({ eq });
  const upsert = jest.fn().mockResolvedValue({ error: null });
  const from = jest.fn().mockReturnValue({ select, upsert });

  createServerClientMock.mockReturnValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: {
          user: {
            id: "user-1",
            email: "user@example.com",
            user_metadata: { full_name: "Profile User" },
          },
        },
        error: null,
      }),
    },
    from,
  });

  return { select, upsert };
}

function buildRequest(role: "teacher" | "student") {
  return new Request("https://selfreg.ai/api/profile-role", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
}

describe("profile role route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    cookiesMock.mockResolvedValue({ getAll: () => [] });
  });

  it("rejects client role escalation for an existing student profile", async () => {
    const mocks = buildClient({ role: "student", metadata: null });
    const { POST } = await import("@/app/api/profile-role/route");

    const response = await POST(buildRequest("teacher"));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Profile role cannot be changed",
      code: "PROFILE_ROLE_IMMUTABLE",
    });
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("returns the existing teacher role without rewriting the profile", async () => {
    const mocks = buildClient({ role: "teacher", metadata: { teacher_code: "T123456" } });
    const { POST } = await import("@/app/api/profile-role/route");

    const response = await POST(buildRequest("teacher"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      role: "teacher",
      nextPath: "/teacher/register-success?auth=success&teacherCode=T123456&next=dashboard",
      teacherCode: "T123456",
    });
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("allows the initial role selection when no profile exists", async () => {
    const mocks = buildClient(null);
    const { POST } = await import("@/app/api/profile-role/route");

    const response = await POST(buildRequest("student"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      ok: true,
      role: "student",
      nextPath: "/student/dashboard?auth=success",
      teacherCode: null,
    }));
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ role: "student" }), { onConflict: "id" });
    expect(ensureStudentChildMock).toHaveBeenCalledWith({
      userId: "user-1",
      email: "user@example.com",
      fullName: "Profile User",
    });
  });
});

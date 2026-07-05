import { GET } from "@/app/api/auth/callback/route";
import { createServerClient } from "@supabase/ssr";

jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(),
}));

jest.mock("@/lib/server-storage", () => ({
  ensureStudentChildForAuthUserInSupabase: jest.fn(),
}));

import { ensureStudentChildForAuthUserInSupabase } from "@/lib/server-storage";

interface MockCookie {
  name: string;
  value: string;
  options?: Record<string, unknown>;
}

function buildRequest(url: string) {
  return {
    url,
    cookies: {
      getAll: () => [],
    },
  } as any;
}

function mockServerClient(options?: {
  roleFromProfile?: string | null;
  metadataFromProfile?: Record<string, unknown> | null;
  exchangeError?: { message: string } | null;
  verifyError?: { message: string } | null;
  upsertError?: { message: string } | null;
  cookiesToSet?: MockCookie[];
}) {
  const exchangeCodeForSession = jest.fn().mockImplementation(async () => {
    options?.cookiesToSet?.length &&
      serverClientOptions?.cookies.setAll(options.cookiesToSet);

    if (options?.exchangeError) {
      return {
        data: { session: null },
        error: options.exchangeError,
      };
    }

    return {
      data: {
        session: {
          user: {
            id: "user-1",
            email: "teacher@example.com",
            user_metadata: {
              full_name: "Teacher User",
            },
          },
        },
      },
      error: null,
    };
  });

  const verifyOtp = jest.fn().mockImplementation(async () => {
    options?.cookiesToSet?.length &&
      serverClientOptions?.cookies.setAll(options.cookiesToSet);

    if (options?.verifyError) {
      return {
        data: { session: null, user: null },
        error: options.verifyError,
      };
    }

    return {
      data: {
        session: {
          user: {
            id: "user-1",
            email: "student@example.com",
            user_metadata: {
              full_name: "Student User",
            },
          },
        },
        user: {
          id: "user-1",
          email: "student@example.com",
          user_metadata: {
            full_name: "Student User",
          },
        },
      },
      error: null,
    };
  });

  const profileMaybeSingle = jest.fn().mockResolvedValue({
    data:
      options?.roleFromProfile || options?.metadataFromProfile
        ? {
            role: options.roleFromProfile ?? null,
            metadata: options.metadataFromProfile ?? null,
          }
        : null,
  });

  const profileEq = jest.fn().mockReturnValue({ maybeSingle: profileMaybeSingle });
  const select = jest.fn().mockReturnValue({ eq: profileEq });
  const upsert = jest.fn().mockResolvedValue({ error: options?.upsertError ?? null });
  const from = jest.fn().mockReturnValue({ select, upsert });

  let serverClientOptions: any;

  (createServerClient as jest.Mock).mockImplementation((_url, _key, incomingOptions) => {
    serverClientOptions = incomingOptions;
    return {
      auth: { exchangeCodeForSession, verifyOtp },
      from,
    };
  });

  return {
    exchangeCodeForSession,
    verifyOtp,
    from,
    select,
    eq: profileEq,
    maybeSingle: profileMaybeSingle,
    upsert,
  };
}

describe("auth callback route", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("redirects to login when oauth provider returned an error", async () => {
    const response = await GET(buildRequest("https://selfreg.ai/api/auth/callback?error=access_denied&lang=ru"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://selfreg.ai/auth/login?lang=ru&auth=error");
  });

  it("persists auth cookies and redirects new teacher oauth to code success page", async () => {
    const mocks = mockServerClient({
      cookiesToSet: [{ name: "sb-session", value: "token", options: { path: "/" } }],
    });

    const response = await GET(
      buildRequest("https://selfreg.ai/api/auth/callback?code=oauth-code&role=teacher&lang=ru")
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toMatch(
      /^https:\/\/selfreg\.ai\/teacher\/register-success\?lang=ru&auth=success&teacherCode=T\d{6}&next=dashboard$/,
    );
    expect(response.cookies.get("sb-session")?.value).toBe("token");
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "teacher",
        metadata: expect.objectContaining({
          teacher_code: expect.stringMatching(/^T\d{6}$/),
        }),
      }),
      { onConflict: "id" },
    );
  });

  it("keeps existing teacher code and redirects returning teacher to dashboard", async () => {
    mockServerClient({
      metadataFromProfile: { teacher_code: "T123456" },
      cookiesToSet: [{ name: "sb-session", value: "token", options: { path: "/" } }],
    });

    const response = await GET(
      buildRequest("https://selfreg.ai/api/auth/callback?code=oauth-code&role=teacher&lang=ru")
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://selfreg.ai/teacher?lang=ru&auth=success");
  });

  it("uses explicit teacher role even when the existing profile is a student", async () => {
    const mocks = mockServerClient({
      roleFromProfile: "student",
      cookiesToSet: [{ name: "sb-session", value: "token", options: { path: "/" } }],
    });

    const response = await GET(
      buildRequest("https://selfreg.ai/api/auth/callback?code=oauth-code&role=teacher&lang=ru")
    );

    expect(response.headers.get("location")).toMatch(
      /^https:\/\/selfreg\.ai\/teacher\/register-success\?lang=ru&auth=success&teacherCode=T\d{6}&next=dashboard$/,
    );
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "teacher",
        metadata: expect.objectContaining({
          teacher_code: expect.stringMatching(/^T\d{6}$/),
        }),
      }),
      { onConflict: "id" },
    );
  });

  it("uses existing profile role when role parameter is missing", async () => {
    const mocks = mockServerClient({
      roleFromProfile: "teacher",
      metadataFromProfile: { teacher_code: "T123456" },
      cookiesToSet: [{ name: "sb-session", value: "token", options: { path: "/" } }],
    });

    const response = await GET(
      buildRequest("https://selfreg.ai/api/auth/callback?code=oauth-code&lang=en")
    );

    expect(response.headers.get("location")).toBe("https://selfreg.ai/teacher?lang=en&auth=success");
    expect(mocks.from).toHaveBeenCalledWith("profiles");
    expect(mocks.select).toHaveBeenCalledWith("role, metadata");
  });

  it("redirects to role selection when no role can be resolved", async () => {
    const mocks = mockServerClient({
      cookiesToSet: [{ name: "sb-session", value: "token", options: { path: "/" } }],
    });

    const response = await GET(
      buildRequest("https://selfreg.ai/api/auth/callback?code=oauth-code&lang=ru")
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://selfreg.ai/role-selection?lang=ru&auth=role_required");
    expect(response.cookies.get("sb-session")?.value).toBe("token");
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(ensureStudentChildForAuthUserInSupabase).not.toHaveBeenCalled();
  });

  it("verifies email confirmation tokens and bootstraps a student child", async () => {
    const mocks = mockServerClient({
      cookiesToSet: [{ name: "sb-session", value: "token", options: { path: "/" } }],
    });
    (ensureStudentChildForAuthUserInSupabase as jest.Mock).mockResolvedValue({ id: "child-1" });

    const response = await GET(
      buildRequest("https://selfreg.ai/api/auth/callback?token_hash=hash-1&type=email&role=student&lang=ru")
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://selfreg.ai/student/dashboard?lang=ru&auth=success");
    expect(mocks.verifyOtp).toHaveBeenCalledWith({
      token_hash: "hash-1",
      type: "email",
    });
    expect(ensureStudentChildForAuthUserInSupabase).toHaveBeenCalledWith({
      userId: "user-1",
      email: "student@example.com",
      fullName: "Student User",
    });
  });
});

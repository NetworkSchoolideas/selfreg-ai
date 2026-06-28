import { GET } from "@/app/api/auth/callback/route";
import { createServerClient } from "@supabase/ssr";

jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(),
}));

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
  exchangeError?: { message: string } | null;
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

  const maybeSingle = jest.fn().mockResolvedValue({
    data: options?.roleFromProfile ? { role: options.roleFromProfile } : null,
  });

  const eq = jest.fn().mockReturnValue({ maybeSingle });
  const select = jest.fn().mockReturnValue({ eq });
  const upsert = jest.fn().mockResolvedValue({ error: options?.upsertError ?? null });
  const from = jest.fn().mockReturnValue({ select, upsert });

  let serverClientOptions: any;

  (createServerClient as jest.Mock).mockImplementation((_url, _key, incomingOptions) => {
    serverClientOptions = incomingOptions;
    return {
      auth: { exchangeCodeForSession },
      from,
    };
  });

  return { exchangeCodeForSession, from, select, eq, maybeSingle, upsert };
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

  it("persists auth cookies and redirects teacher to dashboard when role is provided", async () => {
    mockServerClient({
      cookiesToSet: [{ name: "sb-session", value: "token", options: { path: "/" } }],
    });

    const response = await GET(
      buildRequest("https://selfreg.ai/api/auth/callback?code=oauth-code&role=teacher&lang=ru")
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://selfreg.ai/teacher?lang=ru&auth=success");
    expect(response.cookies.get("sb-session")?.value).toBe("token");
  });

  it("uses existing profile role when role parameter is missing", async () => {
    const mocks = mockServerClient({
      roleFromProfile: "teacher",
      cookiesToSet: [{ name: "sb-session", value: "token", options: { path: "/" } }],
    });

    const response = await GET(
      buildRequest("https://selfreg.ai/api/auth/callback?code=oauth-code&lang=en")
    );

    expect(response.headers.get("location")).toBe("https://selfreg.ai/teacher?lang=en&auth=success");
    expect(mocks.from).toHaveBeenCalledWith("profiles");
    expect(mocks.select).toHaveBeenCalledWith("role");
  });
});

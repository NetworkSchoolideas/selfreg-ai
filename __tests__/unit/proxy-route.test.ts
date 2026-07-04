import { createServerClient } from "@supabase/ssr";
import { proxy } from "@/proxy";

jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(),
}));

function buildRequest(url: string) {
  const nextUrl = new URL(url) as URL & { clone: () => URL };
  nextUrl.clone = () => new URL(nextUrl.toString());

  return {
    nextUrl,
    cookies: {
      getAll: () => [],
      set: jest.fn(),
    },
  } as any;
}

describe("proxy route protection", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("does not create a Supabase client for public routes", async () => {
    const response = await proxy(buildRequest("https://selfreg.ai/?lang=ru"));

    expect(response.status).toBe(200);
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated dashboard access to login", async () => {
    (createServerClient as jest.Mock).mockReturnValue({
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      },
    });

    const response = await proxy(buildRequest("https://selfreg.ai/teacher?lang=en"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://selfreg.ai/auth/login?lang=en");
  });

  it("uses the authenticated getUser result for profile lookup", async () => {
    const getUser = jest.fn().mockResolvedValue({
      data: {
        user: {
          id: "verified-user",
        },
      },
    });
    const single = jest.fn().mockResolvedValue({ data: { role: "teacher" } });
    const eq = jest.fn().mockReturnValue({ single });
    const select = jest.fn().mockReturnValue({ eq });
    const from = jest.fn().mockReturnValue({ select });

    (createServerClient as jest.Mock).mockReturnValue({
      auth: {
        getSession: jest.fn().mockResolvedValue({
          data: {
            session: {
              user: {
                id: "untrusted-session-user",
              },
            },
          },
        }),
        getUser,
      },
      from,
    });

    const response = await proxy(buildRequest("https://selfreg.ai/teacher"));

    expect(response.status).toBe(200);
    expect(getUser).toHaveBeenCalled();
    expect(eq).toHaveBeenCalledWith("id", "verified-user");
  });
});

const mockSignUp = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockSignInWithOAuth = jest.fn();
const mockSignOut = jest.fn();
const mockMaybeSingle = jest.fn();
const mockEq = jest.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockSingle = jest.fn();
const mockUpsertSelect = jest.fn(() => ({ single: mockSingle }));
const mockUpsert = jest.fn(() => ({ select: mockUpsertSelect }));
const mockFrom = jest.fn(() => ({
  select: mockSelect,
  upsert: mockUpsert,
}));

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
      signInWithOAuth: mockSignInWithOAuth,
      signOut: mockSignOut,
    },
    from: mockFrom,
  },
}));

import { buildAuthCallbackUrl, signInWithEmail, signInWithGoogle, signUpWithEmail } from "@/lib/supabase-auth";

function installWindowMock(origin = "https://selfreg.test") {
  const store = new Map<string, string>();
  const url = new URL(origin);

  Object.defineProperty(global, "window", {
    value: {
      location: { origin: url.origin, hostname: url.hostname },
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
      },
    },
    configurable: true,
  });

  return store;
}

describe("signUpWithEmail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    installWindowMock();
    mockSignOut.mockResolvedValue({ error: null });
    mockSignInWithOAuth.mockResolvedValue({ data: { provider: "google" } });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockSingle.mockResolvedValue({
      data: {
        id: "user-1",
        email: "teacher@example.com",
        full_name: "Teacher User",
        avatar_url: "https://avatar.example.com",
        role: "teacher",
        metadata: null,
      },
      error: null,
    });
  });

  it("marks signup as pending confirmation when user exists without a session", async () => {
    mockSignUp.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "teacher@example.com",
          user_metadata: {},
        },
        session: null,
      },
      error: null,
    });

    const result = await signUpWithEmail("teacher@example.com", "Test123!", "Teacher", { role: "teacher" });

    expect(result.error).toBeNull();
    expect(result.hasSession).toBe(false);
    expect(result.needsEmailConfirmation).toBe(true);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("bootstraps the profile when signup returns an authenticated session", async () => {
    mockSignUp.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "teacher@example.com",
          user_metadata: {
            full_name: "Teacher User",
            preferred_role: "teacher",
          },
        },
        session: {
          access_token: "token",
        },
      },
      error: null,
    });

    const result = await signUpWithEmail("teacher@example.com", "Test123!", "Teacher User", { role: "teacher" });

    expect(result.error).toBeNull();
    expect(result.hasSession).toBe(true);
    expect(result.needsEmailConfirmation).toBe(false);
    expect(mockFrom).toHaveBeenCalledWith("profiles");
    expect(mockUpsert).toHaveBeenCalled();
  });
});

describe("signInWithGoogle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.NEXT_PUBLIC_AUTH_REDIRECT_ORIGIN;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    mockSignOut.mockResolvedValue({ error: null });
    mockSignInWithOAuth.mockResolvedValue({ data: { provider: "google" } });
  });

  it("normalizes Vercel preview callback URLs to production and forces account selection", async () => {
    const store = installWindowMock("https://selfreg-ai-alex-smirnov-s-projects.vercel.app");

    await signInWithGoogle({
      redirectTo: "https://selfreg-ai-alex-smirnov-s-projects.vercel.app/auth/callback?role=teacher&lang=ru",
      role: "teacher",
    });

    expect(mockSignOut).toHaveBeenCalledWith({ scope: "local" });
    expect(store.get("selfreg_pending_role")).toBe("teacher");
    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "https://selfreg-ai.vercel.app/auth/callback?role=teacher&lang=ru",
        queryParams: {
          access_type: "offline",
          prompt: "select_account consent",
        },
      },
    });
  });

  it("builds production callback URLs on Vercel preview domains", () => {
    installWindowMock("https://selfreg-ai-alex-smirnov-s-projects.vercel.app");

    expect(buildAuthCallbackUrl({ role: "teacher", lang: "ru" })).toBe(
      "https://selfreg-ai.vercel.app/auth/callback?role=teacher&lang=ru"
    );
  });
});

describe("signInWithEmail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    installWindowMock();
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: "student-1",
        email: "student@example.com",
        full_name: "Student User",
        avatar_url: null,
        role: "student",
        metadata: null,
      },
      error: null,
    });
    mockSingle.mockResolvedValue({
      data: {
        id: "student-1",
        email: "student@example.com",
        full_name: "Student User",
        avatar_url: null,
        role: "student",
        metadata: null,
      },
      error: null,
    });
  });

  it("returns the persisted profile role for post-login routing", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: {
        user: {
          id: "student-1",
          email: "student@example.com",
          user_metadata: {},
        },
      },
      error: null,
    });

    const result = await signInWithEmail("student@example.com", "Test123!", { role: "teacher" });

    expect(result.error).toBeNull();
    expect(result.profile?.role).toBe("student");
  });
});

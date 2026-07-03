const mockSignUp = jest.fn();
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
    },
    from: mockFrom,
  },
}));

import { signUpWithEmail } from "@/lib/supabase-auth";

function installWindowMock() {
  const store = new Map<string, string>();

  Object.defineProperty(global, "window", {
    value: {
      location: { origin: "https://selfreg.test" },
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
}

describe("signUpWithEmail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    installWindowMock();
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

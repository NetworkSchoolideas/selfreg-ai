const getSupabaseAdminMock = jest.fn();
const isSupabaseAdminAvailableMock = jest.fn();

jest.mock("@/lib/supabase", () => ({
  getSupabaseAdmin: () => getSupabaseAdminMock(),
  isSupabaseAdminAvailable: () => isSupabaseAdminAvailableMock(),
}));

describe("e2e setup route", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalEnabled = process.env.SELFREG_E2E_ENABLED;
  const originalSecret = process.env.SELFREG_E2E_SECRET;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.NODE_ENV = "test";
    process.env.SELFREG_E2E_ENABLED = "1";
    process.env.SELFREG_E2E_SECRET = "test-secret";
    isSupabaseAdminAvailableMock.mockReturnValue(true);
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.SELFREG_E2E_ENABLED = originalEnabled;
    process.env.SELFREG_E2E_SECRET = originalSecret;
  });

  it("rejects requests when e2e setup is disabled", async () => {
    process.env.SELFREG_E2E_ENABLED = "0";
    const { POST } = await import("@/app/api/e2e/setup/route");

    const response = await POST(
      new Request("https://selfreg.ai/api/e2e/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-e2e-secret": "test-secret",
        },
        body: JSON.stringify({
          users: [{ email: "teacher@test.com", password: "Test123!", role: "teacher" }],
        }),
      })
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Not found",
      code: "E2E_SETUP_DISABLED",
    });
  });

  it("rejects requests with an invalid secret", async () => {
    const { POST } = await import("@/app/api/e2e/setup/route");

    const response = await POST(
      new Request("https://selfreg.ai/api/e2e/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-e2e-secret": "wrong-secret",
        },
        body: JSON.stringify({
          users: [{ email: "teacher@test.com", password: "Test123!", role: "teacher" }],
        }),
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "E2E setup secret is invalid",
      code: "E2E_SETUP_UNAUTHORIZED",
    });
  });

  it("creates a confirmed teacher and upserts a teacher profile", async () => {
    const listUsers = jest.fn().mockResolvedValue({
      data: { users: [] },
      error: null,
    });
    const createUser = jest.fn().mockResolvedValue({
      data: { user: { id: "teacher-1" } },
      error: null,
    });
    const profileUpsert = jest.fn().mockResolvedValue({ error: null });
    const from = jest.fn().mockReturnValue({
      upsert: profileUpsert,
    });

    getSupabaseAdminMock.mockReturnValue({
      auth: {
        admin: {
          listUsers,
          createUser,
          updateUserById: jest.fn(),
        },
      },
      from,
    });

    const { POST } = await import("@/app/api/e2e/setup/route");
    const response = await POST(
      new Request("https://selfreg.ai/api/e2e/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-e2e-secret": "test-secret",
        },
        body: JSON.stringify({
          users: [
            {
              email: "teacher@test.com",
              password: "Test123!",
              role: "teacher",
              fullName: "Teacher Test",
              school: "E2E School",
            },
          ],
        }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      users: [
        {
          id: "teacher-1",
          email: "teacher@test.com",
          role: "teacher",
          teacherCode: "TESTCOM",
          childId: null,
        },
      ],
    });

    expect(createUser).toHaveBeenCalledWith({
      email: "teacher@test.com",
      password: "Test123!",
      email_confirm: true,
      user_metadata: {
        full_name: "Teacher Test",
        avatar_url: "https://ui-avatars.com/api/?name=Teacher%20Test&background=0f766e&color=fff",
        preferred_role: "teacher",
        school: "E2E School",
        teacher_code: "TESTCOM",
      },
    });
    expect(from).toHaveBeenCalledWith("profiles");
    expect(profileUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "teacher-1",
        email: "teacher@test.com",
        role: "teacher",
        metadata: {
          school: "E2E School",
          teacher_code: "TESTCOM",
        },
      }),
      { onConflict: "id" }
    );
  });

  it("updates an existing user instead of creating a duplicate", async () => {
    const listUsers = jest.fn().mockResolvedValue({
      data: { users: [{ id: "student-1", email: "student@test.com" }] },
      error: null,
    });
    const updateUserById = jest.fn().mockResolvedValue({
      data: { user: { id: "student-1" } },
      error: null,
    });
    const profileUpsert = jest.fn().mockResolvedValue({ error: null });
    const childMaybeSingle = jest.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    const childEq = jest.fn().mockReturnValue({
      maybeSingle: childMaybeSingle,
    });
    const childSelect = jest.fn().mockReturnValue({
      eq: childEq,
    });
    const childInsertSingle = jest.fn().mockResolvedValue({
      data: { id: "child-1" },
      error: null,
    });
    const childInsertSelect = jest.fn().mockReturnValue({
      single: childInsertSingle,
    });
    const childInsert = jest.fn().mockReturnValue({
      select: childInsertSelect,
    });

    getSupabaseAdminMock.mockReturnValue({
      auth: {
        admin: {
          listUsers,
          createUser: jest.fn(),
          updateUserById,
        },
      },
      from: jest.fn().mockImplementation((table: string) => {
        if (table === "profiles") {
          return { upsert: profileUpsert };
        }

        if (table === "children") {
          return {
            select: childSelect,
            insert: childInsert,
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    const { POST } = await import("@/app/api/e2e/setup/route");
    const response = await POST(
      new Request("https://selfreg.ai/api/e2e/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-e2e-secret": "test-secret",
        },
        body: JSON.stringify({
          users: [
            {
              email: "student@test.com",
              password: "Test123!",
              role: "student",
              fullName: "Student Test",
            },
          ],
        }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      users: [
        {
          id: "student-1",
          email: "student@test.com",
          role: "student",
          teacherCode: null,
          childId: "child-1",
        },
      ],
    });

    expect(updateUserById).toHaveBeenCalledWith("student-1", {
      password: "Test123!",
      email_confirm: true,
      user_metadata: {
        full_name: "Student Test",
        avatar_url: "https://ui-avatars.com/api/?name=Student%20Test&background=0f766e&color=fff",
        preferred_role: "student",
      },
    });
    expect(childEq).toHaveBeenCalledWith("user_id", "student-1");
    expect(childInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Student Test",
        class: "",
        user_id: "student-1",
      })
    );
  });
});

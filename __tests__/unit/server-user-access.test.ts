import {
  requireChildAccess,
  requireChildOwner,
  requireServerRole,
  requireServerUserAccess,
  requireSessionAccess,
} from "@/lib/server-user-access";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin, isSupabaseAdminAvailable } from "@/lib/supabase";

jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(),
}));

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

jest.mock("@/lib/supabase", () => ({
  getSupabaseAdmin: jest.fn(),
  isSupabaseAdminAvailable: jest.fn(),
}));

function mockProfileClient(user: { id: string } | null, role: string | null, profileError: Error | null = null) {
  const maybeSingle = jest.fn().mockResolvedValue({
    data: role ? { role } : null,
    error: profileError,
  });
  const eq = jest.fn().mockReturnValue({ maybeSingle });
  const select = jest.fn().mockReturnValue({ eq });
  const from = jest.fn().mockReturnValue({ select });

  (createServerClient as jest.Mock).mockReturnValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from,
  });

  return { from, select, eq, maybeSingle };
}

function mockAdminLookup(table: "children" | "sessions", row: Record<string, string> | null) {
  const maybeSingle = jest.fn().mockResolvedValue({ data: row, error: null });
  const eq = jest.fn().mockReturnValue({ maybeSingle });
  const select = jest.fn().mockReturnValue({ eq });
  const from = jest.fn().mockImplementation((requestedTable: string) => {
    expect(requestedTable).toBe(table);
    return { select };
  });
  (getSupabaseAdmin as jest.Mock).mockReturnValue({ from });
  return { from, select, eq, maybeSingle };
}

describe("server user access", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    (cookies as jest.Mock).mockResolvedValue({ getAll: () => [] });
    (isSupabaseAdminAvailable as jest.Mock).mockReturnValue(true);
  });

  it("returns 401 before any profile or admin lookup when authentication is absent", async () => {
    const getUser = jest.fn().mockResolvedValue({ data: { user: null }, error: null });
    const from = jest.fn();
    (createServerClient as jest.Mock).mockReturnValue({ auth: { getUser }, from });

    const result = await requireServerUserAccess();

    expect(result.response?.status).toBe(401);
    await expect(result.response?.json()).resolves.toEqual({
      error: "Authentication required",
      code: "AUTH_REQUIRED",
    });
    expect(from).not.toHaveBeenCalled();
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("reads the role from profiles instead of user metadata", async () => {
    const profile = mockProfileClient({ id: "student-1" }, "student");

    const result = await requireServerUserAccess();

    expect(result.context).toEqual({
      userId: "student-1",
      role: "student",
      email: "",
      fullName: null,
    });
    expect(profile.from).toHaveBeenCalledWith("profiles");
    expect(profile.select).toHaveBeenCalledWith("role, email, full_name");
    expect(profile.eq).toHaveBeenCalledWith("id", "student-1");
  });

  it("returns 403 for a profile without a permitted role", async () => {
    mockProfileClient({ id: "user-1" }, null);

    const result = await requireServerRole("teacher");

    expect(result.response?.status).toBe(403);
    await expect(result.response?.json()).resolves.toEqual({
      error: "A permitted account role is required",
      code: "ROLE_REQUIRED",
    });
  });

  it("allows a student to access only their own child", async () => {
    mockProfileClient({ id: "student-1" }, "student");
    mockAdminLookup("children", { id: "child-1", user_id: "student-1", teacher_id: "teacher-1" });

    const result = await requireChildAccess("child-1");

    expect(result.context).toEqual({
      userId: "student-1",
      role: "student",
      email: "",
      fullName: null,
      childId: "child-1",
      accessKind: "owner",
    });
  });

  it("allows a teacher only when linked to the child", async () => {
    mockProfileClient({ id: "teacher-1" }, "teacher");
    mockAdminLookup("children", { id: "child-1", user_id: "student-1", teacher_id: "teacher-1" });

    const result = await requireChildAccess("child-1");

    expect(result.context?.accessKind).toBe("linked-teacher");
  });

  it("denies child writes to a linked teacher", async () => {
    mockProfileClient({ id: "teacher-1" }, "teacher");
    mockAdminLookup("children", { id: "child-1", user_id: "student-1", teacher_id: "teacher-1" });

    const result = await requireChildOwner("child-1");

    expect(result.response?.status).toBe(403);
    await expect(result.response?.json()).resolves.toEqual({
      error: "Child write access denied",
      code: "CHILD_WRITE_DENIED",
    });
  });

  it("returns 403 for an unrelated account and 404 for a missing child", async () => {
    mockProfileClient({ id: "student-2" }, "student");
    mockAdminLookup("children", { id: "child-1", user_id: "student-1", teacher_id: "teacher-1" });

    const denied = await requireChildAccess("child-1");
    expect(denied.response?.status).toBe(403);

    mockProfileClient({ id: "student-2" }, "student");
    mockAdminLookup("children", null);
    const missing = await requireChildAccess("missing-child");
    expect(missing.response?.status).toBe(404);
  });

  it("resolves session access through the session child before granting access", async () => {
    mockProfileClient({ id: "teacher-1" }, "teacher");

    const sessionLookup = mockAdminLookup("sessions", { id: "session-1", child_id: "child-1" });
    const childMaybeSingle = jest.fn().mockResolvedValue({
      data: { id: "child-1", user_id: "student-1", teacher_id: "teacher-1" },
      error: null,
    });
    const childEq = jest.fn().mockReturnValue({ maybeSingle: childMaybeSingle });
    const childSelect = jest.fn().mockReturnValue({ eq: childEq });
    sessionLookup.from.mockImplementation((table: string) => {
      if (table === "sessions") return { select: sessionLookup.select };
      if (table === "children") return { select: childSelect };
      throw new Error(`Unexpected table: ${table}`);
    });

    const result = await requireSessionAccess("session-1");

    expect(result.context).toEqual({
      userId: "teacher-1",
      role: "teacher",
      email: "",
      fullName: null,
      childId: "child-1",
      accessKind: "linked-teacher",
    });
  });
});

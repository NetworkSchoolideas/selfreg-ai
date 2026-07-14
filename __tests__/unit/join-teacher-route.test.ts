const getSupabaseAdminMock = jest.fn();
const isSupabaseAdminAvailableMock = jest.fn();
const requireChildOwnerMock = jest.fn();

jest.mock("@/lib/supabase", () => ({
  getSupabaseAdmin: () => getSupabaseAdminMock(),
  isSupabaseAdminAvailable: () => isSupabaseAdminAvailableMock(),
}));

jest.mock("@/lib/server-user-access", () => ({
  requireChildOwner: (childId: string) => requireChildOwnerMock(childId),
}));

function buildRequest(body: unknown) {
  return new Request("https://selfreg.ai/api/join-teacher", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockLinkQueries({
  teacher = { id: "teacher-1", full_name: "Teacher One" },
  child = { id: "child-1", teacher_id: null },
  updateError = null,
}: {
  teacher?: { id: string; full_name: string | null } | null;
  child?: { id: string; teacher_id: string | null } | null;
  updateError?: { message: string } | null;
} = {}) {
  const teacherLimit = jest.fn().mockResolvedValue({ data: teacher ? [teacher] : [], error: null });
  const teacherRoleEq = jest.fn().mockReturnValue({ limit: teacherLimit });
  const teacherContains = jest.fn().mockReturnValue({ eq: teacherRoleEq });
  const teacherSelect = jest.fn().mockReturnValue({ contains: teacherContains });

  const childMaybeSingle = jest.fn().mockResolvedValue({ data: child, error: null });
  const childEq = jest.fn().mockReturnValue({ maybeSingle: childMaybeSingle });
  const childSelect = jest.fn().mockReturnValue({ eq: childEq });
  const updateIs = jest.fn().mockResolvedValue({ error: updateError });
  const updateEq = jest.fn().mockReturnValue({ is: updateIs });
  const update = jest.fn().mockReturnValue({ eq: updateEq });

  getSupabaseAdminMock.mockReturnValue({
    from: (table: string) => {
      if (table === "profiles") return { select: teacherSelect };
      if (table === "children") return { select: childSelect, update };
      throw new Error(`Unexpected table: ${table}`);
    },
  });

  return { teacherContains, teacherRoleEq, teacherLimit, childEq, update, updateEq, updateIs };
}

describe("join teacher route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isSupabaseAdminAvailableMock.mockReturnValue(true);
    requireChildOwnerMock.mockResolvedValue({ context: { childId: "child-1", accessKind: "owner" } });
  });

  it("links the authenticated student's unlinked child to a valid teacher code", async () => {
    const queries = mockLinkQueries();
    const { POST } = await import("@/app/api/join-teacher/route");

    const response = await POST(buildRequest({ teacherCode: " T123456 ", childId: " child-1 " }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      teacherId: "teacher-1",
      teacherName: "Teacher One",
      alreadyLinked: false,
    });
    expect(requireChildOwnerMock).toHaveBeenCalledWith("child-1");
    expect(queries.teacherContains).toHaveBeenCalledWith("metadata", { teacher_code: "T123456" });
    expect(queries.teacherRoleEq).toHaveBeenCalledWith("role", "teacher");
    expect(queries.teacherLimit).toHaveBeenCalledWith(2);
    expect(queries.update).toHaveBeenCalledWith({ teacher_id: "teacher-1" });
    expect(queries.updateEq).toHaveBeenCalledWith("id", "child-1");
    expect(queries.updateIs).toHaveBeenCalledWith("teacher_id", null);
  });

  it("rejects a child the authenticated student does not own before code lookup", async () => {
    requireChildOwnerMock.mockResolvedValue({
      response: Response.json({ error: "Child access denied", code: "CHILD_ACCESS_DENIED" }, { status: 403 }),
    });
    const { POST } = await import("@/app/api/join-teacher/route");

    const response = await POST(buildRequest({ teacherCode: "T123456", childId: "other-child" }));

    expect(response.status).toBe(403);
    expect(getSupabaseAdminMock).not.toHaveBeenCalled();
  });

  it("returns a neutral response when the teacher code is unavailable", async () => {
    mockLinkQueries({ teacher: null });
    const { POST } = await import("@/app/api/join-teacher/route");

    const response = await POST(buildRequest({ teacherCode: "UNKNOWN", childId: "child-1" }));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Teacher code is not available", code: "TEACHER_CODE_NOT_FOUND" });
  });

  it("keeps a repeated link to the same teacher idempotent", async () => {
    const queries = mockLinkQueries({ child: { id: "child-1", teacher_id: "teacher-1" } });
    const { POST } = await import("@/app/api/join-teacher/route");

    const response = await POST(buildRequest({ teacherCode: "T123456", childId: "child-1" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      teacherId: "teacher-1",
      teacherName: "Teacher One",
      alreadyLinked: true,
    });
    expect(queries.update).not.toHaveBeenCalled();
  });

  it("rejects relinking a child to another teacher", async () => {
    const queries = mockLinkQueries({ child: { id: "child-1", teacher_id: "teacher-2" } });
    const { POST } = await import("@/app/api/join-teacher/route");

    const response = await POST(buildRequest({ teacherCode: "T123456", childId: "child-1" }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Child is already linked to another teacher",
      code: "CHILD_ALREADY_LINKED",
    });
    expect(queries.update).not.toHaveBeenCalled();
  });
});

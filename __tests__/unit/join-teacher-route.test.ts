const fromMock = jest.fn();

jest.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

describe("join teacher route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("links a child to the teacher found by metadata teacher code", async () => {
    const single = jest.fn().mockResolvedValue({
      data: { id: "teacher-1", full_name: "Teacher One" },
      error: null,
    });
    const roleEq = jest.fn().mockReturnValue({ single });
    const contains = jest.fn().mockReturnValue({ eq: roleEq });
    const select = jest.fn().mockReturnValue({ contains });

    const updateEq = jest.fn().mockResolvedValue({ error: null });
    const update = jest.fn().mockReturnValue({ eq: updateEq });

    fromMock.mockImplementation((table: string) => {
      if (table === "profiles") {
        return { select };
      }

      if (table === "children") {
        return { update };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { POST } = await import("@/app/api/join-teacher/route");

    const response = await POST(
      new Request("https://selfreg.ai/api/join-teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherCode: " T123456 ", childId: " child-1 " }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      teacherId: "teacher-1",
      teacherName: "Teacher One",
    });

    expect(fromMock).toHaveBeenCalledWith("profiles");
    expect(select).toHaveBeenCalledWith("id, full_name");
    expect(contains).toHaveBeenCalledWith("metadata", { teacher_code: "T123456" });
    expect(roleEq).toHaveBeenCalledWith("role", "teacher");

    expect(fromMock).toHaveBeenCalledWith("children");
    expect(update).toHaveBeenCalledWith({ teacher_id: "teacher-1" });
    expect(updateEq).toHaveBeenCalledWith("id", "child-1");
  });

  it("returns 404 when teacher code is not found", async () => {
    const single = jest.fn().mockResolvedValue({
      data: null,
      error: { message: "No rows found" },
    });
    const roleEq = jest.fn().mockReturnValue({ single });
    const contains = jest.fn().mockReturnValue({ eq: roleEq });
    const select = jest.fn().mockReturnValue({ contains });

    fromMock.mockImplementation((table: string) => {
      if (table === "profiles") {
        return { select };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { POST } = await import("@/app/api/join-teacher/route");

    const response = await POST(
      new Request("https://selfreg.ai/api/join-teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherCode: "UNKNOWN", childId: "child-1" }),
      })
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Invalid teacher code",
    });
  });
});

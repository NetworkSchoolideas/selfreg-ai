import { GET, POST } from "@/app/api/children/route";
import {
  ensureStudentChildForAuthUserInSupabase,
  fetchChildByUserIdFromSupabase,
  fetchChildrenFromSupabase,
  upsertChildInSupabase,
} from "@/lib/server-storage";
import { requireTeacherAccess } from "@/lib/server-teacher-access";
import { requireChildAccess, requireServerRole } from "@/lib/server-user-access";

jest.mock("@/lib/server-storage", () => ({
  ensureStudentChildForAuthUserInSupabase: jest.fn(),
  fetchChildByUserIdFromSupabase: jest.fn(),
  fetchChildFromSupabase: jest.fn(),
  fetchChildrenFromSupabase: jest.fn(),
  upsertChildInSupabase: jest.fn(),
  deleteChildFromSupabase: jest.fn(),
}));

jest.mock("@/lib/server-teacher-access", () => ({
  requireTeacherAccess: jest.fn(),
}));

jest.mock("@/lib/server-user-access", () => ({
  requireChildAccess: jest.fn(),
  requireServerRole: jest.fn(),
}));

describe("children route teacher access", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("resolves childId=current through the authenticated user id", async () => {
    (requireServerRole as jest.Mock).mockResolvedValue({
      context: {
        userId: "student-auth-1",
        role: "student",
        email: "student@example.com",
        fullName: "Student User",
      },
    });
    (fetchChildByUserIdFromSupabase as jest.Mock).mockResolvedValue({
      id: "child-1",
      name: "Student",
    });

    const response = await GET(new Request("https://selfreg.ai/api/children?childId=current"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      child: {
        id: "child-1",
        name: "Student",
      },
    });
    expect(fetchChildByUserIdFromSupabase).toHaveBeenCalledWith("student-auth-1");
    expect(requireServerRole).toHaveBeenCalledWith("student");
  });

  it("bootstraps the current student child when the auth user has no child yet", async () => {
    (requireServerRole as jest.Mock).mockResolvedValue({
      context: {
        userId: "student-auth-2",
        role: "student",
        email: "fresh-student@example.com",
        fullName: "Fresh Student",
      },
    });
    (fetchChildByUserIdFromSupabase as jest.Mock).mockResolvedValue(null);
    (ensureStudentChildForAuthUserInSupabase as jest.Mock).mockResolvedValue({
      id: "child-2",
      name: "Fresh Student",
    });

    const response = await GET(new Request("https://selfreg.ai/api/children?childId=current"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      child: {
        id: "child-2",
        name: "Fresh Student",
      },
    });
    expect(ensureStudentChildForAuthUserInSupabase).toHaveBeenCalledWith({
      userId: "student-auth-2",
      email: "fresh-student@example.com",
      fullName: "Fresh Student",
    });
  });

  it("rejects an unauthenticated current-child read before storage access", async () => {
    (requireServerRole as jest.Mock).mockResolvedValue({
      response: Response.json({ error: "Authentication required", code: "AUTH_REQUIRED" }, { status: 401 }),
    });

    const response = await GET(new Request("https://selfreg.ai/api/children?childId=current"));

    expect(response.status).toBe(401);
    expect(fetchChildByUserIdFromSupabase).not.toHaveBeenCalled();
  });

  it("checks child ownership before reading an explicit childId", async () => {
    (requireChildAccess as jest.Mock).mockResolvedValue({
      response: Response.json({ error: "Child access denied", code: "CHILD_ACCESS_DENIED" }, { status: 403 }),
    });

    const response = await GET(new Request("https://selfreg.ai/api/children?childId=other-child"));

    expect(response.status).toBe(403);
    expect(requireChildAccess).toHaveBeenCalledWith("other-child");
  });

  it("rejects unauthenticated list requests without teacherId", async () => {
    (requireTeacherAccess as jest.Mock).mockResolvedValue({
      response: Response.json(
        { error: "Teacher authentication required", code: "TEACHER_AUTH_REQUIRED" },
        { status: 401 }
      ),
    });

    const response = await GET(new Request("https://selfreg.ai/api/children"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Teacher authentication required",
      code: "TEACHER_AUTH_REQUIRED",
    });
    expect(requireTeacherAccess).toHaveBeenCalledWith(undefined);
    expect(fetchChildrenFromSupabase).not.toHaveBeenCalled();
  });

  it("loads children for the authenticated teacher when teacherId is omitted", async () => {
    (requireTeacherAccess as jest.Mock).mockResolvedValue({ teacherId: "teacher-auth-1" });
    (fetchChildrenFromSupabase as jest.Mock).mockResolvedValue([{ id: "child-1" }]);

    const response = await GET(new Request("https://selfreg.ai/api/children"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      children: [{ id: "child-1" }],
    });
    expect(fetchChildrenFromSupabase).toHaveBeenCalledWith("teacher-auth-1");
  });

  it("rejects unauthenticated child writes without teacherId", async () => {
    (requireTeacherAccess as jest.Mock).mockResolvedValue({
      response: Response.json(
        { error: "Teacher authentication required", code: "TEACHER_AUTH_REQUIRED" },
        { status: 401 }
      ),
    });

    const response = await POST(
      new Request("https://selfreg.ai/api/children", {
        method: "POST",
        body: JSON.stringify({ name: "Student" }),
      })
    );

    expect(response.status).toBe(401);
    expect(upsertChildInSupabase).not.toHaveBeenCalled();
  });

  it("assigns child writes without teacherId to the authenticated teacher", async () => {
    (requireTeacherAccess as jest.Mock).mockResolvedValue({ teacherId: "teacher-auth-1" });
    (upsertChildInSupabase as jest.Mock).mockResolvedValue({
      id: "child-1",
      name: "Student",
      teacherId: "teacher-auth-1",
    });

    const response = await POST(
      new Request("https://selfreg.ai/api/children", {
        method: "POST",
        body: JSON.stringify({ name: "Student" }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      child: {
        id: "child-1",
        name: "Student",
        teacherId: "teacher-auth-1",
      },
    });
    expect(upsertChildInSupabase).toHaveBeenCalledWith({
      name: "Student",
      teacherId: "teacher-auth-1",
    });
  });
});

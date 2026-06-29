import {
  buildAdolescentPrototypeHref,
  resolveTeacherLinkContext,
} from "@/lib/teacher-link";

describe("teacher link helpers", () => {
  it("treats teacher code pattern as teacherCodeFromUrl", () => {
    expect(resolveTeacherLinkContext("T123456")).toEqual({
      teacherCodeFromUrl: "T123456",
    });
  });

  it("treats non-code teacher param as teacherIdFromUrl", () => {
    expect(resolveTeacherLinkContext("E2E_TEACHER_123")).toEqual({
      teacherIdFromUrl: "E2E_TEACHER_123",
    });
  });

  it("builds prototype href with childId only", () => {
    expect(buildAdolescentPrototypeHref("child-1", "ru")).toBe("/adolescent?childId=child-1&lang=ru");
  });
});

import { createErrorResponse } from "@/lib/api-errors";
import { requireServerRole } from "@/lib/server-user-access";

interface TeacherAccessResult {
  teacherId?: string;
  response?: ReturnType<typeof createErrorResponse>;
}

function isE2ETeacherAccessBypassEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.SELFREG_E2E_TEACHER_ACCESS_BYPASS === "1";
}

export async function resolveTeacherAccess(requestedTeacherId?: string | null): Promise<TeacherAccessResult> {
  if (requestedTeacherId && isE2ETeacherAccessBypassEnabled()) {
    return { teacherId: requestedTeacherId };
  }

  const access = await requireServerRole("teacher");
  if (access.response) {
    if (access.response.status === 401) {
      return {
        response: createErrorResponse("Teacher authentication required", 401, "TEACHER_AUTH_REQUIRED"),
      };
    }
    return { response: access.response };
  }

  const authenticatedTeacherId = access.context.userId;

  if (!requestedTeacherId) {
    return { teacherId: authenticatedTeacherId ?? undefined };
  }

  if (authenticatedTeacherId === requestedTeacherId) {
    return { teacherId: requestedTeacherId };
  }

  return {
    response: createErrorResponse("Teacher access denied", 403, "TEACHER_ACCESS_DENIED"),
  };
}

export async function requireTeacherAccess(requestedTeacherId?: string | null): Promise<TeacherAccessResult> {
  const access = await resolveTeacherAccess(requestedTeacherId);
  if (access.teacherId || access.response) {
    return access;
  }

  return { response: createErrorResponse("Teacher authentication required", 401, "TEACHER_AUTH_REQUIRED") };
}

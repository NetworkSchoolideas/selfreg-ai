import { z } from "zod";
import { clientError, createErrorResponse, serverError } from "@/lib/api-errors";
import { getSupabaseAdmin, isSupabaseAdminAvailable } from "@/lib/supabase";
import { requireChildOwner } from "@/lib/server-user-access";

const JoinTeacherPayload = z.object({
  teacherCode: z.string().trim().min(1),
  childId: z.string().trim().min(1),
});

interface TeacherProfileRow {
  id: string;
  full_name: string | null;
}

interface ChildLinkRow {
  id: string;
  teacher_id: string | null;
}

export async function POST(request: Request) {
  try {
    const payload = JoinTeacherPayload.parse(await request.json());
    const ownership = await requireChildOwner(payload.childId);
    if (ownership.response) {
      return ownership.response;
    }

    if (!isSupabaseAdminAvailable()) {
      return serverError("Supabase admin client is not configured", "SUPABASE_ADMIN_UNAVAILABLE");
    }

    const supabaseAdmin: any = getSupabaseAdmin();
    const { data: teacherProfiles, error: teacherError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .contains("metadata", { teacher_code: payload.teacherCode })
      .eq("role", "teacher")
      .limit(2);

    if (teacherError) {
      return serverError(teacherError.message, "TEACHER_CODE_LOOKUP_ERROR");
    }

    if (!teacherProfiles || teacherProfiles.length !== 1) {
      return createErrorResponse("Teacher code is not available", 404, "TEACHER_CODE_NOT_FOUND");
    }

    const teacher = teacherProfiles[0] as TeacherProfileRow;
    const { data: child, error: childError } = await supabaseAdmin
      .from("children")
      .select("id, teacher_id")
      .eq("id", payload.childId)
      .maybeSingle();

    if (childError) {
      return serverError(childError.message, "CHILD_LINK_LOOKUP_ERROR");
    }

    if (!child) {
      return createErrorResponse("Child not found", 404, "CHILD_NOT_FOUND");
    }

    const linkedChild = child as ChildLinkRow;
    if (linkedChild.teacher_id && linkedChild.teacher_id !== teacher.id) {
      return createErrorResponse("Child is already linked to another teacher", 409, "CHILD_ALREADY_LINKED");
    }

    if (!linkedChild.teacher_id) {
      const { error: updateError } = await supabaseAdmin
        .from("children")
        .update({ teacher_id: teacher.id })
        .eq("id", payload.childId)
        .is("teacher_id", null);

      if (updateError) {
        return serverError(updateError.message, "CHILD_LINK_UPDATE_ERROR");
      }
    }

    return Response.json({
      ok: true,
      teacherId: teacher.id,
      teacherName: teacher.full_name,
      alreadyLinked: linkedChild.teacher_id === teacher.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return clientError("teacherCode and childId are required", "VALIDATION_ERROR");
    }

    return serverError("Unable to link child to teacher", "TEACHER_LINK_ERROR");
  }
}

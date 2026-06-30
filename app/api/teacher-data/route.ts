import { NextResponse } from "next/server";
import { computeTeacherAnalytics, fetchChildrenFromSupabase } from "@/lib/server-storage";
import { serverError } from "@/lib/api-errors";
import { resolveTeacherAccess } from "@/lib/server-teacher-access";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const access = await resolveTeacherAccess(url.searchParams.get("teacherId"));
    if (access.response) {
      return access.response;
    }

    const teacherId = access.teacherId;
    const includeAnalytics = url.searchParams.get("analytics") === "true";

    if (!teacherId) {
      return NextResponse.json({
        ok: true,
        children: [],
        analytics: null,
      });
    }

    const children = await fetchChildrenFromSupabase(teacherId);

    let analytics = null;
    if (includeAnalytics) {
      analytics = await computeTeacherAnalytics(teacherId);
    }

    return NextResponse.json({
      ok: true,
      children,
      analytics,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load teacher data";
    return serverError(message, "TEACHER_DATA_ERROR");
  }
}

import { NextResponse } from "next/server";
import { fetchChildrenFromSupabase, computeTeacherAnalytics } from "@/lib/server-storage";
import { serverError } from "@/lib/api-errors";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const teacherId = url.searchParams.get("teacherId") || undefined;
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

import { NextResponse } from "next/server";
import { fetchChildrenFromSupabase } from "@/lib/server-storage";
import { serverError } from "@/lib/api-errors";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const teacherId = url.searchParams.get("teacherId") || undefined;

    if (!teacherId) {
      return NextResponse.json({
        ok: true,
        children: [],
      });
    }

    const children = await fetchChildrenFromSupabase(teacherId);

    return NextResponse.json({
      ok: true,
      children,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load teacher data";
    return serverError(message, "TEACHER_DATA_ERROR");
  }
}

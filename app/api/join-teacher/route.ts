import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

interface TeacherProfileRow {
  id: string;
  full_name: string | null;
}

export async function POST(request: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { ok: false, error: "Supabase admin not configured" },
        { status: 500 }
      );
    }

    const { teacherCode, childId } = await request.json();

    if (!teacherCode || !childId) {
      return NextResponse.json(
        { ok: false, error: "teacherCode and childId are required" },
        { status: 400 }
      );
    }

    const normalizedTeacherCode = String(teacherCode).trim();
    const normalizedChildId = String(childId).trim();

    if (!normalizedTeacherCode || !normalizedChildId) {
      return NextResponse.json(
        { ok: false, error: "teacherCode and childId are required" },
        { status: 400 }
      );
    }

    // Find teacher by teacher code stored in profile metadata.
    const { data: teacherProfile, error: teacherError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .contains("metadata", { teacher_code: normalizedTeacherCode })
      .eq("role", "teacher")
      .single();

    if (teacherError || !teacherProfile) {
      return NextResponse.json(
        { ok: false, error: "Invalid teacher code" },
        { status: 404 }
      );
    }

    const updateData = { teacher_id: (teacherProfile as TeacherProfileRow).id };
    const updateTable: any = supabaseAdmin.from("children");
    const { error: updateError } = await updateTable.update(updateData).eq("id", normalizedChildId);

    if (updateError) {
      console.error("[join-teacher] Failed to update child:", updateError);
      return NextResponse.json(
        { ok: false, error: "Failed to link child to teacher" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      teacherId: (teacherProfile as TeacherProfileRow).id,
      teacherName: (teacherProfile as TeacherProfileRow).full_name,
    });
  } catch (error) {
    console.error("[join-teacher] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

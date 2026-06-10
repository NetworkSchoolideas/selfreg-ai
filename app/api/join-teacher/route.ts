import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

if (!supabaseAdmin) {
  throw new Error("Supabase admin not configured");
}

export async function POST(request: Request) {
  try {
    const { teacherCode, childId } = await request.json();

    if (!teacherCode || !childId) {
      return NextResponse.json(
        { ok: false, error: "teacherCode and childId are required" },
        { status: 400 }
      );
    }

    // Find teacher by teacher_code
    const { data: teacherProfile, error: teacherError } = await supabaseAdmin!
      .from("profiles")
      .select("id, full_name")
      .eq("teacher_code", teacherCode)
      .eq("role", "teacher")
      .single();

    if (teacherError || !teacherProfile) {
      return NextResponse.json(
        { ok: false, error: "Invalid teacher code" },
        { status: 404 }
      );
    }

    // Update child with teacherId - using any to bypass Supabase types
    const updateData: any = { teacherId: (teacherProfile as any).id };
    const updateTable: any = supabaseAdmin!.from("children");
    const { error: updateError } = await updateTable.update(updateData).eq("id", childId);

    if (updateError) {
      console.error("[join-teacher] Failed to update child:", updateError);
      return NextResponse.json(
        { ok: false, error: "Failed to link child to teacher" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      teacherId: (teacherProfile as any).id,
      teacherName: (teacherProfile as any).full_name,
    });
  } catch (error) {
    console.error("[join-teacher] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

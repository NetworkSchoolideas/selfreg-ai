import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin, isSupabaseAdminAvailable } from "@/lib/supabase";
import { clientError, serverError } from "@/lib/api-errors";
import { requireChildOwner } from "@/lib/server-user-access";
import type { Database } from "@/types/supabase";

const SessionFeedbackPayload = z.object({
  childId: z.string().min(1),
  sessionId: z.string().min(1).optional(),
  adolescentFeedback: z
    .object({
      rating: z.number().optional(),
      comment: z.string(),
      timestamp: z.string(),
    })
    .optional(),
  historyInsight: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const payload = SessionFeedbackPayload.parse(await request.json());
    const access = await requireChildOwner(payload.childId);
    if (access.response) {
      return access.response;
    }

    if (!isSupabaseAdminAvailable()) {
      return serverError("Supabase admin client is not configured", "SUPABASE_ADMIN_UNAVAILABLE");
    }

    const supabaseAdmin: any = getSupabaseAdmin();

    let sessionQuery = supabaseAdmin
      .from("sessions")
      .select("*")
      .eq("child_id", payload.childId)
      .eq("status", "completed");

    if (payload.sessionId) {
      sessionQuery = sessionQuery.eq("id", payload.sessionId);
    } else {
      sessionQuery = sessionQuery.order("updated_at", { ascending: false }).limit(1);
    }

    const { data: latestSession, error: sessionError } = await sessionQuery.maybeSingle();

    if (sessionError) {
      return serverError(sessionError.message, "SUPABASE_SESSION_LOOKUP_ERROR");
    }

    if (!latestSession) {
      return clientError("No completed session found for this child", "SESSION_NOT_FOUND");
    }

    const patch: Database["public"]["Tables"]["sessions"]["Update"] = {};
    if (payload.adolescentFeedback) {
      patch.adolescent_feedback = payload.adolescentFeedback;
    }
    if (payload.historyInsight !== undefined) {
      patch.history_insight = payload.historyInsight || null;
    }

    const { error: updateError } = await supabaseAdmin
      .from("sessions")
      .update(patch)
      .eq("id", latestSession.id);

    if (updateError) {
      return serverError(updateError.message, "SUPABASE_SESSION_UPDATE_ERROR");
    }

    const touchTimestamp =
      payload.adolescentFeedback?.timestamp ||
      new Date().toISOString();

    const { error: childTouchError } = await supabaseAdmin
      .from("children")
      .update({ updated_at: touchTimestamp })
      .eq("id", payload.childId);

    if (childTouchError) {
      return serverError(childTouchError.message, "SUPABASE_CHILD_TOUCH_ERROR");
    }

    return NextResponse.json({
      ok: true,
      sessionId: latestSession.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return clientError("Invalid feedback payload", "VALIDATION_ERROR");
    }

    const message = error instanceof Error ? error.message : "Session feedback sync failed";
    return serverError(message, "SESSION_FEEDBACK_SYNC_ERROR");
  }
}

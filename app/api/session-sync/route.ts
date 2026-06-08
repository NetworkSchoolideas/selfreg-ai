import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin, isSupabaseAdminAvailable } from "@/lib/supabase";
import { clientError, serverError } from "@/lib/api-errors";
import type { Database } from "@/types/supabase";

const SessionSyncPayload = z.object({
  sessionId: z.string().uuid().optional(),
  childId: z.string().min(1),
  context: z.string().min(1),
  finalNote: z.string(),
  updatedAt: z.string().min(1),
  lang: z.enum(["ru", "en"]).optional(),
  historyInsight: z.string().optional(),
  adolescentFeedback: z
    .object({
      rating: z.number().optional(),
      comment: z.string(),
      timestamp: z.string(),
    })
    .optional(),
  records: z.array(
    z.object({
      stageId: z.string(),
      stageTitle: z.string(),
      scenario: z.string(),
      eventType: z.enum(["answer", "clarify_request", "back", "skip"]).optional(),
      provider: z.string().optional(),
      model: z.string().optional(),
      responseMode: z.enum(["mock", "llm-json", "llm-text", "llm-fallback"]).optional(),
      answer: z.string(),
      feedback: z.string(),
      question: z.string(),
      timestamp: z.string(),
    })
  ),
});

export async function POST(request: Request) {
  try {
    if (!isSupabaseAdminAvailable()) {
      return serverError("Supabase admin client is not configured", "SUPABASE_ADMIN_UNAVAILABLE");
    }

    const payload = SessionSyncPayload.parse(await request.json());
    const supabaseAdmin: any = getSupabaseAdmin();

    const { data: existingChild, error: childError } = await supabaseAdmin
      .from("children")
      .select("*")
      .eq("id", payload.childId)
      .maybeSingle();

    if (childError) {
      return serverError(childError.message, "SUPABASE_CHILD_LOOKUP_ERROR");
    }

    if (!existingChild) {
      return clientError("Child not found", "CHILD_NOT_FOUND");
    }

    const existingSessionQuery = supabaseAdmin
      .from("sessions")
      .select("*")
      .eq("child_id", payload.childId);

    const { data: existingSession, error: existingSessionError } = await (payload.sessionId
      ? existingSessionQuery.eq("id", payload.sessionId)
      : existingSessionQuery.eq("updated_at", payload.updatedAt)
    ).maybeSingle();

    if (existingSessionError) {
      return serverError(existingSessionError.message, "SUPABASE_SESSION_LOOKUP_ERROR");
    }

    let sessionId = existingSession?.id;
    const isCompleted = Boolean(payload.finalNote.trim());

    if (sessionId) {
      const sessionPatch: Database["public"]["Tables"]["sessions"]["Update"] = {
        context: payload.context,
        final_note: payload.finalNote,
        status: isCompleted ? "completed" : "in_progress",
        completed_at: isCompleted ? payload.updatedAt : null,
        updated_at: payload.updatedAt,
        lang: payload.lang || null,
        history_insight: payload.historyInsight || null,
        adolescent_feedback: payload.adolescentFeedback || null,
      };

      const { error: updateError } = await supabaseAdmin
        .from("sessions")
        .update(sessionPatch)
        .eq("id", sessionId);

      if (updateError) {
        return serverError(updateError.message, "SUPABASE_SESSION_UPDATE_ERROR");
      }

      const { error: deleteRecordsError } = await supabaseAdmin
        .from("session_records")
        .delete()
        .eq("session_id", sessionId);

      if (deleteRecordsError) {
        return serverError(deleteRecordsError.message, "SUPABASE_RECORDS_DELETE_ERROR");
      }
    } else {
      const sessionInsert: Database["public"]["Tables"]["sessions"]["Insert"] = {
        id: payload.sessionId,
        child_id: payload.childId,
        context: payload.context,
        final_note: payload.finalNote,
        status: isCompleted ? "completed" : "in_progress",
        completed_at: isCompleted ? payload.updatedAt : null,
        created_at: payload.updatedAt,
        updated_at: payload.updatedAt,
        lang: payload.lang || null,
        history_insight: payload.historyInsight || null,
        adolescent_feedback: payload.adolescentFeedback || null,
      };

      const { data: insertedSession, error: insertError } = await supabaseAdmin
        .from("sessions")
        .insert(sessionInsert)
        .select("*")
        .single();

      if (insertError || !insertedSession) {
        return serverError(insertError?.message || "Failed to insert session", "SUPABASE_SESSION_INSERT_ERROR");
      }

      sessionId = insertedSession.id;
    }

    if (payload.records.length > 0) {
      const sessionRecords: Database["public"]["Tables"]["session_records"]["Insert"][] =
        payload.records.map((record) => ({
          session_id: sessionId!,
          stage_id: Number(record.stageId),
          stage_title: record.stageTitle,
          scenario: record.scenario,
          event_type: record.eventType || null,
          provider: record.provider || null,
          model: record.model || null,
          response_mode: record.responseMode || null,
          feedback: record.feedback,
          question: record.question || null,
          answer: record.answer || null,
          created_at: record.timestamp,
        }));

      const metadataSafeRecords = sessionRecords.map((record) => ({
        session_id: record.session_id,
        stage_id: record.stage_id,
        stage_title: record.stage_title,
        scenario: record.scenario,
        event_type: record.event_type,
        feedback: record.feedback,
        question: record.question,
        answer: record.answer,
        created_at: record.created_at,
      }));

      const legacyRecords = metadataSafeRecords.map((record) => ({
        session_id: record.session_id,
        stage_id: record.stage_id,
        stage_title: record.stage_title,
        scenario: record.scenario,
        feedback: record.feedback,
        question: record.question,
        answer: record.answer,
        created_at: record.created_at,
      }));

      const fullInsert = await supabaseAdmin.from("session_records").insert(sessionRecords);
      if (fullInsert.error) {
        const metadataSafeInsert = await supabaseAdmin.from("session_records").insert(metadataSafeRecords);
        if (metadataSafeInsert.error) {
          const legacyInsert = await supabaseAdmin.from("session_records").insert(legacyRecords);
          if (legacyInsert.error) {
            return serverError(legacyInsert.error.message, "SUPABASE_RECORDS_INSERT_ERROR");
          }
        }
      }
    }

    const { error: childTouchError } = await supabaseAdmin
      .from("children")
      .update({ updated_at: payload.updatedAt })
      .eq("id", payload.childId);

    if (childTouchError) {
      return serverError(childTouchError.message, "SUPABASE_CHILD_TOUCH_ERROR");
    }

    return NextResponse.json({
      ok: true,
      sessionId,
      records: payload.records.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return clientError("Invalid session payload", "VALIDATION_ERROR");
    }

    const message = error instanceof Error ? error.message : "Session sync failed";
    return serverError(message, "SESSION_SYNC_ERROR");
  }
}


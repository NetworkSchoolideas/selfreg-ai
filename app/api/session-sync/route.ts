import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { getSupabaseAdmin, isSupabaseAdminAvailable } from "@/lib/supabase";
import { clientError, serverError } from "@/lib/api-errors";
import { requireChildOwner } from "@/lib/server-user-access";
import {
  getSessionSyncRecordIdentity,
  mergeSessionSyncRecords,
  type SessionSyncRecordPayload,
} from "@/lib/session-sync";
import type { Database } from "@/types/supabase";

const SessionSyncUpsertPayload = z.object({
  action: z.literal("upsert").optional(),
  sessionId: z.string().uuid().optional(),
  childId: z.string().min(1),
  status: z.enum(["draft", "in_progress", "completed", "abandoned"]).optional(),
  context: z.string().min(1),
  finalNote: z.string(),
  updatedAt: z.string().min(1),
  lang: z.enum(["ru", "en"]).optional(),
  historyInsight: z.string().optional(),
  studentArchivedAt: z.string().optional(),
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

const SessionSyncDeletePayload = z
  .object({
    action: z.literal("delete"),
    childId: z.string().min(1),
    sessionId: z.string().uuid().optional(),
    sessionUpdatedAt: z.string().min(1).optional(),
  })
  .refine((payload) => Boolean(payload.sessionId || payload.sessionUpdatedAt), {
    message: "sessionId or sessionUpdatedAt is required",
  });

function getSessionRecordId(sessionId: string, record: SessionSyncRecordPayload) {
  const hash = createHash("sha256")
    .update(`${sessionId}\u0000${getSessionSyncRecordIdentity(record)}`)
    .digest("hex");
  const variant = ((Number.parseInt(hash[16], 16) & 0x3) | 0x8).toString(16);

  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-${variant}${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function isIncomingSessionUpdateCurrent(existingUpdatedAt: string | null | undefined, incomingUpdatedAt: string) {
  const existingTimestamp = Date.parse(existingUpdatedAt || "");
  const incomingTimestamp = Date.parse(incomingUpdatedAt);

  return !Number.isFinite(existingTimestamp)
    || !Number.isFinite(incomingTimestamp)
    || incomingTimestamp >= existingTimestamp;
}

const SESSION_RECORDS_SELECT = `
  stage_id,
  stage_title,
  scenario,
  event_type,
  provider,
  model,
  response_mode,
  feedback,
  question,
  answer,
  created_at
`;

const SESSION_RECORDS_LEGACY_SELECT = `
  stage_id,
  stage_title,
  scenario,
  feedback,
  question,
  answer,
  created_at
`;

function mapStoredSessionRecord(record: Record<string, unknown>): SessionSyncRecordPayload {
  return {
    stageId: String(record.stage_id),
    stageTitle: String(record.stage_title || ""),
    scenario: String(record.scenario || ""),
    eventType: typeof record.event_type === "string"
      ? record.event_type as SessionSyncRecordPayload["eventType"]
      : undefined,
    provider: typeof record.provider === "string" ? record.provider : undefined,
    model: typeof record.model === "string" ? record.model : undefined,
    responseMode: typeof record.response_mode === "string"
      ? record.response_mode as SessionSyncRecordPayload["responseMode"]
      : undefined,
    feedback: String(record.feedback || ""),
    question: typeof record.question === "string" ? record.question : "",
    answer: typeof record.answer === "string" ? record.answer : "",
    timestamp: String(record.created_at),
  };
}

async function loadStoredSessionRecords(supabaseAdmin: any, sessionId: string) {
  const fullResult = await supabaseAdmin
    .from("session_records")
    .select(SESSION_RECORDS_SELECT)
    .eq("session_id", sessionId);

  if (!fullResult.error) {
    return { records: (fullResult.data || []).map(mapStoredSessionRecord) };
  }

  const legacyResult = await supabaseAdmin
    .from("session_records")
    .select(SESSION_RECORDS_LEGACY_SELECT)
    .eq("session_id", sessionId);

  if (legacyResult.error) {
    return { error: legacyResult.error };
  }

  return { records: (legacyResult.data || []).map(mapStoredSessionRecord) };
}

export async function POST(request: Request) {
  try {
    const rawPayload = await request.json();
    const payload = rawPayload?.action === "delete"
      ? SessionSyncDeletePayload.parse(rawPayload)
      : SessionSyncUpsertPayload.parse(rawPayload);

    const access = await requireChildOwner(payload.childId);
    if (access.response) {
      return access.response;
    }

    if (!isSupabaseAdminAvailable()) {
      return serverError("Supabase admin client is not configured", "SUPABASE_ADMIN_UNAVAILABLE");
    }

    const supabaseAdmin: any = getSupabaseAdmin();

    if (payload.action === "delete") {

      const sessionLookup = supabaseAdmin
        .from("sessions")
        .select("id")
        .eq("child_id", payload.childId);

      const { data: existingSession, error: existingSessionError } = await (payload.sessionId
        ? sessionLookup.eq("id", payload.sessionId)
        : sessionLookup.eq("updated_at", payload.sessionUpdatedAt)
      ).maybeSingle();

      if (existingSessionError) {
        return serverError(existingSessionError.message, "SUPABASE_SESSION_LOOKUP_ERROR");
      }

      if (!existingSession) {
        return clientError("Session not found", "SESSION_NOT_FOUND");
      }

      const { error: deleteRecordsError } = await supabaseAdmin
        .from("session_records")
        .delete()
        .eq("session_id", existingSession.id);

      if (deleteRecordsError) {
        return serverError(deleteRecordsError.message, "SUPABASE_RECORDS_DELETE_ERROR");
      }

      const { error: deleteSessionError } = await supabaseAdmin
        .from("sessions")
        .delete()
        .eq("id", existingSession.id);

      if (deleteSessionError) {
        return serverError(deleteSessionError.message, "SUPABASE_SESSION_DELETE_ERROR");
      }

      const touchTimestamp = new Date().toISOString();
      const { error: childTouchError } = await supabaseAdmin
        .from("children")
        .update({ updated_at: touchTimestamp })
        .eq("id", payload.childId);

      if (childTouchError) {
        return serverError(childTouchError.message, "SUPABASE_CHILD_TOUCH_ERROR");
      }

      return NextResponse.json({
        ok: true,
        deleted: true,
        sessionId: existingSession.id,
      });
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
    let storedRecords: SessionSyncRecordPayload[] = [];
    const sessionStatus = payload.status || (payload.finalNote.trim() ? "completed" : "in_progress");
    const isCompleted = sessionStatus === "completed";

    if (sessionId) {
      const storedRecordsResult = await loadStoredSessionRecords(supabaseAdmin, sessionId);
      if (storedRecordsResult.error) {
        return serverError(storedRecordsResult.error.message, "SUPABASE_RECORDS_LOOKUP_ERROR");
      }
      storedRecords = storedRecordsResult.records;

      const sessionPatch: Database["public"]["Tables"]["sessions"]["Update"] = {
        context: payload.context,
        final_note: payload.finalNote,
        status: sessionStatus,
        completed_at: isCompleted ? payload.updatedAt : null,
        updated_at: payload.updatedAt,
        lang: payload.lang || null,
        history_insight: payload.historyInsight || null,
        adolescent_feedback: payload.adolescentFeedback || null,
        student_archived_at: payload.studentArchivedAt || null,
      };

      if (isIncomingSessionUpdateCurrent(existingSession.updated_at, payload.updatedAt)) {
        const { error: updateError } = await supabaseAdmin
          .from("sessions")
          .update(sessionPatch)
          .eq("id", sessionId);

        if (updateError) {
          return serverError(updateError.message, "SUPABASE_SESSION_UPDATE_ERROR");
        }
      }

    } else {
      const sessionPatch: Database["public"]["Tables"]["sessions"]["Update"] = {
        context: payload.context,
        final_note: payload.finalNote,
        status: sessionStatus,
        completed_at: isCompleted ? payload.updatedAt : null,
        updated_at: payload.updatedAt,
        lang: payload.lang || null,
        history_insight: payload.historyInsight || null,
        adolescent_feedback: payload.adolescentFeedback || null,
        student_archived_at: payload.studentArchivedAt || null,
      };
      const sessionInsert: Database["public"]["Tables"]["sessions"]["Insert"] = {
        id: payload.sessionId,
        child_id: payload.childId,
        context: payload.context,
        final_note: payload.finalNote,
        status: sessionStatus,
        completed_at: isCompleted ? payload.updatedAt : null,
        created_at: payload.updatedAt,
        updated_at: payload.updatedAt,
        lang: payload.lang || null,
        history_insight: payload.historyInsight || null,
        adolescent_feedback: payload.adolescentFeedback || null,
        student_archived_at: payload.studentArchivedAt || null,
      };

      const { data: insertedSession, error: insertError } = await supabaseAdmin
        .from("sessions")
        .insert(sessionInsert)
        .select("*")
        .single();

      if (insertError || !insertedSession) {
        const duplicateSession =
          Boolean(payload.sessionId) &&
          (insertError?.code === "23505" || insertError?.message?.includes("duplicate key"));

        if (!duplicateSession) {
          return serverError(insertError?.message || "Failed to insert session", "SUPABASE_SESSION_INSERT_ERROR");
        }

        const { data: racedSession, error: racedSessionError } = await supabaseAdmin
          .from("sessions")
          .select("*")
          .eq("id", payload.sessionId)
          .eq("child_id", payload.childId)
          .maybeSingle();

        if (racedSessionError || !racedSession) {
          return serverError(
            racedSessionError?.message || insertError?.message || "Failed to resolve existing session",
            "SUPABASE_SESSION_INSERT_ERROR",
          );
        }

        sessionId = racedSession.id;

        const storedRecordsResult = await loadStoredSessionRecords(supabaseAdmin, sessionId);
        if (storedRecordsResult.error) {
          return serverError(storedRecordsResult.error.message, "SUPABASE_RECORDS_LOOKUP_ERROR");
        }
        storedRecords = storedRecordsResult.records;

        if (isIncomingSessionUpdateCurrent(racedSession.updated_at, payload.updatedAt)) {
          const { error: updateError } = await supabaseAdmin
            .from("sessions")
            .update(sessionPatch)
            .eq("id", sessionId);

          if (updateError) {
            return serverError(updateError.message, "SUPABASE_SESSION_UPDATE_ERROR");
          }
        }

      } else {
        sessionId = insertedSession.id;
      }
    }

    const recordsToPersist = mergeSessionSyncRecords(storedRecords, payload.records);
    const storedRecordIds = new Set(storedRecords.map(getSessionSyncRecordIdentity));
    const recordsToInsert = recordsToPersist.filter(
      (record) => !storedRecordIds.has(getSessionSyncRecordIdentity(record)),
    );

    if (recordsToInsert.length > 0) {
      const sessionRecords: Database["public"]["Tables"]["session_records"]["Insert"][] =
        recordsToInsert.map((record) => ({
          id: getSessionRecordId(sessionId!, record),
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
        id: record.id,
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
        id: record.id,
        session_id: record.session_id,
        stage_id: record.stage_id,
        stage_title: record.stage_title,
        scenario: record.scenario,
        feedback: record.feedback,
        question: record.question,
        answer: record.answer,
        created_at: record.created_at,
      }));

      const fullInsert = await supabaseAdmin
        .from("session_records")
        .upsert(sessionRecords, { onConflict: "id", ignoreDuplicates: true });
      if (fullInsert.error) {
        const metadataSafeInsert = await supabaseAdmin
          .from("session_records")
          .upsert(metadataSafeRecords, { onConflict: "id", ignoreDuplicates: true });
        if (metadataSafeInsert.error) {
          const legacyInsert = await supabaseAdmin
            .from("session_records")
            .upsert(legacyRecords, { onConflict: "id", ignoreDuplicates: true });
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
      records: recordsToPersist.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return clientError("Invalid session payload", "VALIDATION_ERROR");
    }

    const message = error instanceof Error ? error.message : "Session sync failed";
    return serverError(message, "SESSION_SYNC_ERROR");
  }
}


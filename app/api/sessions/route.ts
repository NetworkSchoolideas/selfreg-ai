import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin, isSupabaseAdminAvailable } from "@/lib/supabase";
import { clientError, serverError } from "@/lib/api-errors";
import { requireChildAccess } from "@/lib/server-user-access";

/**
 * API route для CRUD операций с сессиями.
 *
 * GET  /api/sessions?childId=xxx — получить все сессии ребёнка
 * DELETE /api/sessions?sessionId=xxx — удалить сессию
 *
 * Для создания/обновления сессий используется /api/session-sync (POST).
 */

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const childId = url.searchParams.get("childId");

    if (!childId) {
      return clientError("childId is required", "VALIDATION_ERROR");
    }

    const access = await requireChildAccess(childId);
    if (access.response) {
      return access.response;
    }

    if (!isSupabaseAdminAvailable()) {
      return serverError("Supabase admin client is not configured", "SUPABASE_ADMIN_UNAVAILABLE");
    }

    const supabaseAdmin: any = getSupabaseAdmin();

    // Получаем ребёнка со всеми сессиями и записями
    const { data: child, error } = await supabaseAdmin
      .from("children")
      .select(`
        id,
        sessions (
          id,
          child_id,
          context,
          final_note,
          status,
          completed_at,
          created_at,
          updated_at,
          lang,
          history_insight,
          adolescent_feedback,
          student_archived_at,
          session_records (
            id,
            session_id,
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
          )
        )
      `)
      .eq("id", childId)
      .maybeSingle();

    if (error) {
      return serverError(error.message, "SUPABASE_CHILD_LOOKUP_ERROR");
    }

    if (!child) {
      return NextResponse.json({ ok: true, sessions: [] });
    }

    // Сортируем сессии: новые сверху
    const sessions = (child.sessions || []).sort(
      (a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

    return NextResponse.json({ ok: true, sessions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load sessions";
    return serverError(message, "SESSIONS_LOAD_ERROR");
  }
}

export async function DELETE(request: Request) {
  try {
    if (!isSupabaseAdminAvailable()) {
      return serverError("Supabase admin client is not configured", "SUPABASE_ADMIN_UNAVAILABLE");
    }

    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId");
    const childId = url.searchParams.get("childId");

    if (!sessionId) {
      return clientError("sessionId is required", "VALIDATION_ERROR");
    }

    const supabaseAdmin: any = getSupabaseAdmin();

    // Удаляем записи сессии
    const { error: recordsError } = await supabaseAdmin
      .from("session_records")
      .delete()
      .eq("session_id", sessionId);

    if (recordsError) {
      return serverError(recordsError.message, "SUPABASE_RECORDS_DELETE_ERROR");
    }

    // Удаляем саму сессию
    const { error: sessionError } = await supabaseAdmin
      .from("sessions")
      .delete()
      .eq("id", sessionId);

    if (sessionError) {
      return serverError(sessionError.message, "SUPABASE_SESSION_DELETE_ERROR");
    }

    // Обновляем updated_at у ребёнка
    if (childId) {
      await supabaseAdmin
        .from("children")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", childId);
    }

    return NextResponse.json({ ok: true, sessionId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete session";
    return serverError(message, "SESSION_DELETE_ERROR");
  }
}

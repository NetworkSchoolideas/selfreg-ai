import type { Database, Json } from "@/types/supabase";
import type { AdolescentFeedback, ChildProfile, RecordItem, Session } from "@/types/session";
import { getSupabaseAdmin, isSupabaseAdminAvailable } from "@/lib/supabase";
import { inferRecordEventType } from "@/lib/session-helpers";

type ChildRow = Database["public"]["Tables"]["children"]["Row"];
type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];
type SessionRecordRow = Database["public"]["Tables"]["session_records"]["Row"];

type NestedSessionRow = SessionRow & {
  session_records?: SessionRecordRow[] | null;
};

type NestedChildRow = ChildRow & {
  sessions?: NestedSessionRow[] | null;
};

const CHILDREN_WITH_EVENT_TYPE_SELECT = `
  id,
  name,
  class,
  user_id,
  teacher_id,
  consent_given,
  consent_timestamp,
  metadata,
  created_at,
  updated_at,
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
`;

const CHILDREN_EVENT_TYPE_SELECT = CHILDREN_WITH_EVENT_TYPE_SELECT
  .replace(/\s*provider,\n/, "\n")
  .replace(/\s*model,\n/, "\n")
  .replace(/\s*response_mode,\n/, "\n");

const CHILDREN_LEGACY_SELECT = CHILDREN_EVENT_TYPE_SELECT.replace(/\s*event_type,\n/, "\n");

function isMissingEventTypeError(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() || "";
  return message.includes("event_type") || message.includes("could not find") || message.includes("does not exist");
}

export interface ChildUpsertInput {
  id?: string;
  name: string;
  className?: string;
  teacherId?: string;
  consentGiven?: boolean;
  consentTimestamp?: string;
  realData?: {
    fio: string;
    klass: string;
  };
}

function asAdolescentFeedback(value: Json | null): AdolescentFeedback | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const rating = typeof value.rating === "number" ? value.rating : undefined;
  const comment = typeof value.comment === "string" ? value.comment : "";
  const timestamp = typeof value.timestamp === "string" ? value.timestamp : new Date().toISOString();

  if (!comment && rating == null) {
    return undefined;
  }

  return {
    rating,
    comment,
    timestamp,
  };
}

function mapRecord(row: SessionRecordRow): RecordItem {
  const record: RecordItem = {
    stageId: String(row.stage_id) as RecordItem["stageId"],
    stageTitle: row.stage_title,
    scenario: row.scenario as RecordItem["scenario"],
    eventType: (row as SessionRecordRow & { event_type?: RecordItem["eventType"] | null }).event_type || undefined,
    provider: (row as SessionRecordRow & { provider?: RecordItem["provider"] | null }).provider || undefined,
    model: (row as SessionRecordRow & { model?: string | null }).model || undefined,
    responseMode: (row as SessionRecordRow & { response_mode?: RecordItem["responseMode"] | null }).response_mode || undefined,
    answer: row.answer || "",
    feedback: row.feedback,
    question: row.question || "",
    timestamp: row.created_at,
  };

  return {
    ...record,
    eventType: inferRecordEventType(record),
  };
}

function mapSession(row: NestedSessionRow): Session {
  const records = (row.session_records || [])
    .slice()
    .sort((a, b) => {
      const timeDelta = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (Number.isFinite(timeDelta) && timeDelta !== 0) {
        return timeDelta;
      }

      return a.stage_id - b.stage_id;
    })
    .map(mapRecord);

  return {
    sessionId: row.id,
    status: row.status === "completed" ? "completed" : "in_progress",
    context: row.context,
    records,
    finalNote: row.final_note || "",
    updatedAt: row.updated_at,
    lang: (row.lang as Session["lang"]) || undefined,
    historyInsight: row.history_insight || undefined,
    adolescentFeedback: asAdolescentFeedback(row.adolescent_feedback),
  };
}

function mapChild(row: NestedChildRow): ChildProfile {
  const metadata = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
    ? row.metadata
    : null;
  const realData =
    metadata && "realData" in metadata && metadata.realData && typeof metadata.realData === "object" && !Array.isArray(metadata.realData)
      ? {
          fio: typeof metadata.realData.fio === "string" ? metadata.realData.fio : row.name,
          klass: typeof metadata.realData.klass === "string" ? metadata.realData.klass : row.class,
        }
      : {
          fio: row.name,
          klass: row.class,
        };

  const sessions = (row.sessions || [])
    .slice()
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .map(mapSession);

  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sessions,
    realData,
    teacherId: row.teacher_id || undefined,
    consentGiven: row.consent_given ?? undefined,
    consentTimestamp: row.consent_timestamp || undefined,
  };
}

function mapChildInsert(input: ChildUpsertInput): Database["public"]["Tables"]["children"]["Insert"] {
  const now = new Date().toISOString();

  return {
    id: input.id,
    name: input.name,
    class: input.className || input.realData?.klass || "",
    teacher_id: input.teacherId || null,
    consent_given: input.consentGiven ?? false,
    consent_timestamp: input.consentTimestamp || null,
    metadata: input.realData ? { realData: input.realData } : null,
    created_at: now,
    updated_at: now,
  };
}

function mapChildUpdate(input: ChildUpsertInput): Database["public"]["Tables"]["children"]["Update"] {
  return {
    name: input.name,
    class: input.className || input.realData?.klass || "",
    teacher_id: input.teacherId || null,
    consent_given: input.consentGiven ?? false,
    consent_timestamp: input.consentTimestamp || null,
    metadata: input.realData ? { realData: input.realData } : null,
    updated_at: new Date().toISOString(),
  };
}

export async function fetchChildrenFromSupabase(teacherId?: string): Promise<ChildProfile[]> {
  if (!isSupabaseAdminAvailable()) {
    return [];
  }

  const supabaseAdmin: any = getSupabaseAdmin();

  const buildQuery = (select: string) => {
    let query = supabaseAdmin.from("children").select(select);

    if (teacherId) {
      query = query.eq("teacher_id", teacherId);
    }

    return query.order("updated_at", { ascending: false });
  };

  let { data, error } = await buildQuery(CHILDREN_WITH_EVENT_TYPE_SELECT);

  if (error && isMissingEventTypeError(error)) {
    const eventTypeOnly = await buildQuery(CHILDREN_EVENT_TYPE_SELECT);
    data = eventTypeOnly.data;
    error = eventTypeOnly.error;

    if (error && isMissingEventTypeError(error)) {
      const legacy = await buildQuery(CHILDREN_LEGACY_SELECT);
      data = legacy.data;
      error = legacy.error;
    }
  }

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as NestedChildRow[]).map(mapChild);
}

export async function fetchChildFromSupabase(childId: string): Promise<ChildProfile | null> {
  if (!isSupabaseAdminAvailable()) {
    return null;
  }

  const supabaseAdmin: any = getSupabaseAdmin();

  const buildQuery = (select: string) =>
    supabaseAdmin
      .from("children")
      .select(select)
      .eq("id", childId)
      .maybeSingle();

  let { data, error } = await buildQuery(CHILDREN_WITH_EVENT_TYPE_SELECT);

  if (error && isMissingEventTypeError(error)) {
    const eventTypeOnly = await buildQuery(CHILDREN_EVENT_TYPE_SELECT);
    data = eventTypeOnly.data;
    error = eventTypeOnly.error;

    if (error && isMissingEventTypeError(error)) {
      const legacy = await buildQuery(CHILDREN_LEGACY_SELECT);
      data = legacy.data;
      error = legacy.error;
    }
  }

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapChild(data as NestedChildRow) : null;
}

export async function upsertChildInSupabase(input: ChildUpsertInput): Promise<ChildProfile> {
  if (!isSupabaseAdminAvailable()) {
    throw new Error("Supabase admin client is not configured");
  }

  const supabaseAdmin = getSupabaseAdmin();

  if (input.id) {
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("children")
      .select("id")
      .eq("id", input.id)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (existing) {
      const childrenTable: any = supabaseAdmin.from("children");
      const { error: updateError } = await childrenTable
        .update(mapChildUpdate(input))
        .eq("id", input.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      const updatedChild = await fetchChildFromSupabase(input.id);
      if (!updatedChild) {
        throw new Error("Failed to reload updated child");
      }
      return updatedChild;
    }
  }

  const insertPayload = mapChildInsert(input);
  const childrenTable: any = supabaseAdmin.from("children");
  const { data: inserted, error: insertError } = await childrenTable
    .insert(insertPayload)
    .select("id")
    .single();

  if (insertError || !inserted) {
    throw new Error(insertError?.message || "Failed to create child");
  }

  const createdChild = await fetchChildFromSupabase((inserted as { id: string }).id);
  if (!createdChild) {
    throw new Error("Failed to reload created child");
  }

  return createdChild;
}

export async function deleteChildFromSupabase(childId: string): Promise<void> {
  if (!isSupabaseAdminAvailable()) {
    throw new Error("Supabase admin client is not configured");
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.from("children").delete().eq("id", childId);
  if (error) {
    throw new Error(error.message);
  }
}

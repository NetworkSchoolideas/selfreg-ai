import type { AdolescentFeedback, Session } from "@/types/session";

export interface SessionSyncRecordPayload {
  stageId: string;
  stageTitle: string;
  scenario: string;
  eventType?: "answer" | "clarify_request" | "back" | "skip";
  provider?: string;
  model?: string;
  responseMode?: "mock" | "llm-json" | "llm-text" | "llm-fallback";
  answer: string;
  feedback: string;
  question: string;
  timestamp: string;
}

function recordIdentity(record: SessionSyncRecordPayload) {
  return [
    record.timestamp,
    record.eventType || "",
    record.stageId,
    record.stageTitle,
    record.scenario,
    record.answer,
    record.feedback,
    record.question,
  ].join("\u0001");
}

/**
 * Session records are append-only process history. A second browser tab can
 * submit an older local snapshot, so preserve records already stored by the
 * server instead of allowing that snapshot to erase them.
 */
export function mergeSessionSyncRecords(
  storedRecords: SessionSyncRecordPayload[],
  incomingRecords: SessionSyncRecordPayload[],
) {
  const merged = new Map<string, SessionSyncRecordPayload>();

  for (const record of storedRecords) {
    merged.set(recordIdentity(record), record);
  }

  for (const record of incomingRecords) {
    merged.set(recordIdentity(record), record);
  }

  return Array.from(merged.values()).sort((left, right) => {
    const timeDelta = new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime();
    if (Number.isFinite(timeDelta) && timeDelta !== 0) {
      return timeDelta;
    }

    return Number(left.stageId) - Number(right.stageId);
  });
}

export interface SessionSyncUpsertPayload {
  action: "upsert";
  sessionId?: string;
  childId: string;
  status?: Session["status"];
  context: string;
  finalNote: string;
  updatedAt: string;
  lang?: "ru" | "en";
  historyInsight?: string;
  adolescentFeedback?: AdolescentFeedback;
  studentArchivedAt?: string;
  records: SessionSyncRecordPayload[];
}

function normalizeEventType(eventType: Session["records"][number]["eventType"]) {
  if (!eventType) {
    return undefined;
  }

  if (eventType === "retry") {
    return "answer";
  }

  return eventType;
}

export function toSessionSyncUpsertPayload(childId: string, session: Session): SessionSyncUpsertPayload {
  return {
    action: "upsert",
    sessionId: session.sessionId,
    childId,
    status: session.status,
    context: session.context,
    finalNote: session.finalNote,
    updatedAt: session.updatedAt,
    lang: session.lang,
    historyInsight: session.historyInsight,
    adolescentFeedback: session.adolescentFeedback,
    studentArchivedAt: session.studentArchivedAt,
    records: session.records.map((record) => ({
      stageId: String(record.stageId),
      stageTitle: record.stageTitle,
      scenario: record.scenario,
      eventType: normalizeEventType(record.eventType),
      provider: record.provider,
      model: record.model,
      responseMode: record.responseMode,
      answer: record.answer,
      feedback: record.feedback,
      question: record.question,
      timestamp: record.timestamp,
    })),
  };
}

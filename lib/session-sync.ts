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

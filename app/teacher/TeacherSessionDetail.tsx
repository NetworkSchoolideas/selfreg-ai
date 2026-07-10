"use client";

import type { RecordItem, Session } from "@/lib/children-storage";
import { inferRecordEventType } from "@/lib/session-helpers";
import { isRetryRecord } from "@/lib/selfreg-flow-machine";
import { getSessionSignals } from "@/lib/teacher-dashboard-analytics";

interface TeacherSessionDetailUi {
  selectSessionAbove: string;
  records: string;
  archivedByStudent: string;
  emptySession: string;
  sessionSignals: string;
  noSpecialSignals: string;
  clarificationQuestion: string;
  returnToQuestion: string;
  retryAnswer: string;
  signalCount: (label: string, count: number) => string;
  trajectoryNote: (signals: ReturnType<typeof getSessionSignals>) => string;
  stage: string;
  eventLabel: (record: RecordItem) => string;
  scenarioLabel: (scenario: string) => string;
  questionLabel: string;
  answerLabel: string;
  supportLabel: string;
  aiSourceLabel: string;
  responseModeLabel: (mode?: RecordItem["responseMode"]) => string;
  finalInterpretation: string;
  aiInsightTitle: string;
  adolescentFeedback: string;
  usefulness: (rating: number) => string;
}

interface TeacherSessionDetailProps {
  currentSession: Session | null;
  locale: string;
  ui: TeacherSessionDetailUi;
}

function getScenarioColor(scenario: "A" | "B" | "clarify" | "skipped") {
  return scenario === "A"
    ? "var(--accent)"
    : scenario === "B"
      ? "var(--orange)"
      : scenario === "clarify"
        ? "var(--green)"
        : "var(--muted)";
}

function getEventBadgeStyle(record: RecordItem) {
  const eventType = inferRecordEventType(record);
  if (eventType === "clarify_request") {
    return { background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0" };
  }
  if (eventType === "back") {
    return { background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa" };
  }
  if (eventType === "skip") {
    return { background: "#f3f4f6", color: "#4b5563", border: "1px solid #d1d5db" };
  }
  return { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" };
}

export function TeacherSessionDetail({ currentSession, locale, ui }: TeacherSessionDetailProps) {
  if (!currentSession) {
    return (
      <div className="panel">
        <div className="muted">{ui.selectSessionAbove}</div>
      </div>
    );
  }

  const currentSessionSignals = getSessionSignals(currentSession.records);

  return (
    <div className="panel">
      <div className="session-detail-header">
        <div>
          <strong className="session-context-title">{currentSession.context}</strong>
          <span className="muted session-detail-date">
            {new Date(currentSession.updatedAt).toLocaleString(locale)}
          </span>
        </div>
        <div className="muted session-records-count">{currentSession.records.length} {ui.records}</div>
      </div>

      {currentSession.studentArchivedAt && (
        <div className="profile-field mb-16" style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}>
          <div className="fs-14 fw-600" style={{ color: "#92400e" }}>{ui.archivedByStudent}</div>
          <div className="fs-12 c-muted mt-4">{new Date(currentSession.studentArchivedAt).toLocaleString(locale)}</div>
        </div>
      )}

      {currentSession.records.length === 0 && <div className="empty-session-placeholder">{ui.emptySession}</div>}

      {currentSession.records.length > 0 && (
        <div className="records-grid">
          <div className="signals-box">
            <div className="signals-box-title">{ui.sessionSignals}</div>
            {currentSessionSignals.clarifications === 0 && currentSessionSignals.returns === 0 && currentSessionSignals.retries === 0 ? (
              <div className="no-special-signals">{ui.noSpecialSignals}</div>
            ) : (
              <div className="signals-row">
                {currentSessionSignals.clarifications > 0 && (
                  <span className="badge badge-green">
                    {ui.signalCount(ui.clarificationQuestion, currentSessionSignals.clarifications)}
                  </span>
                )}
                {currentSessionSignals.returns > 0 && (
                  <span className="badge return-badge">
                    {ui.signalCount(ui.returnToQuestion, currentSessionSignals.returns)}
                  </span>
                )}
                {currentSessionSignals.retries > 0 && (
                  <span className="badge badge-blue">
                    {ui.signalCount(ui.retryAnswer, currentSessionSignals.retries)}
                  </span>
                )}
              </div>
            )}
            <div className="trajectory-note">{ui.trajectoryNote(currentSessionSignals)}</div>
          </div>

          {currentSession.records.map((record, index) => {
            const eventType = inferRecordEventType(record);
            const isProcessOnly = eventType === "clarify_request" || eventType === "back";

            return (
              <div
                key={`${record.stageId}-${index}-${record.timestamp || ""}`}
                className="record-item"
                style={{ borderLeft: `4px solid ${getScenarioColor(record.scenario)}` }}
              >
                <div className="record-meta">
                  {ui.stage} {record.stageId} · {record.stageTitle}
                </div>
                <div className="record-tags">
                  <span className="badge" style={getEventBadgeStyle(record)}>
                    {ui.eventLabel(record)}
                  </span>
                  {!isProcessOnly && (
                    <span
                      className="scenario-badge"
                      style={{
                        background: record.scenario === "skipped" ? "var(--muted)" : getScenarioColor(record.scenario),
                      }}
                    >
                      {ui.scenarioLabel(record.scenario)}
                    </span>
                  )}
                  {isRetryRecord(currentSession.records, index) && (
                    <span className="badge badge-blue">{ui.retryAnswer}</span>
                  )}
                  {record.timestamp && (
                    <span className="muted record-timestamp">
                      {new Date(record.timestamp).toLocaleString(locale)}
                    </span>
                  )}
                </div>
                <div className="record-field"><strong>{ui.questionLabel}</strong> {record.question}</div>
                <div className="record-field"><strong>{ui.answerLabel}</strong> {record.answer}</div>
                <div className="support-label-text"><strong>{ui.supportLabel}</strong> {record.feedback}</div>
                {(record.responseMode || record.provider || record.model) && (
                  <div className="muted record-source">
                    <strong>{ui.aiSourceLabel}</strong>{" "}
                    {[record.provider, record.model, ui.responseModeLabel(record.responseMode)].filter(Boolean).join(" · ")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {currentSession.finalNote && (
        <div className="final-note-box">
          <strong>{ui.finalInterpretation}</strong>
          <p className="p-line" style={{ marginTop: 6 }}>{currentSession.finalNote}</p>
        </div>
      )}

      {currentSession.historyInsight && (
        <div className="insight-box">
          <div className="insight-title">{ui.aiInsightTitle}</div>
          <p className="p-line" style={{ margin: 0 }}>{currentSession.historyInsight}</p>
        </div>
      )}

      {currentSession.adolescentFeedback && (
        <div className="feedback-box">
          <div className="feedback-title">
            {ui.adolescentFeedback}
            {currentSession.adolescentFeedback.rating && (
              <span className="feedback-rating">{ui.usefulness(currentSession.adolescentFeedback.rating)}</span>
            )}
          </div>
          {currentSession.adolescentFeedback.comment && (
            <p className="p-line" style={{ margin: 0 }}>{currentSession.adolescentFeedback.comment}</p>
          )}
          <div className="feedback-timestamp">
            {new Date(currentSession.adolescentFeedback.timestamp).toLocaleString(locale)}
          </div>
        </div>
      )}
    </div>
  );
}

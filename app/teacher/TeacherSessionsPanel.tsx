"use client";

import type { Session } from "@/lib/children-storage";
import { inferRecordEventType } from "@/lib/session-helpers";
import { getSessionSignals } from "@/lib/teacher-dashboard-analytics";

interface TeacherSessionsPanelUi {
  sessionsLabel: string;
  archivedByStudent: string;
  noSessions: string;
  stepsShort: string;
  clarification: string;
  returnToQuestion: string;
  skipped: string;
  retryAnswer: string;
}

interface TeacherSessionsPanelProps {
  ui: TeacherSessionsPanelUi;
  locale: string;
  sortedSessions: Session[];
  selectedSessionIdx: number;
  highlightedSessionUpdatedAt: string | null;
  onSelectSession: (index: number) => void;
}

export function TeacherSessionsPanel({
  ui,
  locale,
  sortedSessions,
  selectedSessionIdx,
  highlightedSessionUpdatedAt,
  onSelectSession,
}: TeacherSessionsPanelProps) {
  return (
    <div className="panel mb-16">
      <div className="sessions-header">
        <div>
          <strong className="fs-15">{ui.sessionsLabel}</strong>
          <span className="muted sessions-count">({sortedSessions.length})</span>
        </div>
        <span className="fs-12 c-muted">{locale.startsWith("en") ? "Read-only" : "Только просмотр"}</span>
      </div>

      {sortedSessions.length === 0 ? (
          <div className="empty-state-dashed">
            <p className="muted mb-10">{ui.noSessions}</p>
          </div>
      ) : (
        <div className="sessions-grid">
          {sortedSessions.map((session, idx) => {
            const isSelected = idx === selectedSessionIdx;
            const isNew = session.updatedAt === highlightedSessionUpdatedAt;
            const recordCount = session.records.length;
            const answerRecords = session.records.filter((record) => inferRecordEventType(record) === "answer");
            const scenarioACount = answerRecords.filter((record) => record.scenario === "A").length;
            const scenarioBCount = answerRecords.filter((record) => record.scenario === "B").length;
            const flowSignals = getSessionSignals(session.records);
            const processBits = [
              `A:${scenarioACount}`,
              `B:${scenarioBCount}`,
              flowSignals.clarifications > 0 ? `${ui.clarification}:${flowSignals.clarifications}` : null,
              flowSignals.returns > 0 ? `${ui.returnToQuestion}:${flowSignals.returns}` : null,
              flowSignals.skips > 0 ? `${ui.skipped}:${flowSignals.skips}` : null,
              flowSignals.retries > 0 ? `${ui.retryAnswer}:${flowSignals.retries}` : null,
            ].filter(Boolean).join(" · ");

            return (
              <button
                key={`${session.updatedAt}-${idx}`}
                onClick={() => onSelectSession(idx)}
                className="session-card-btn"
                style={{
                  border: isSelected ? "2px solid var(--accent)" : "1px solid var(--line)",
                  background: isSelected ? "var(--soft)" : "white",
                  boxShadow: isNew ? "0 0 0 3px #f2c94c" : undefined,
                }}
                title={session.context}
              >
                <div className="session-card-title">
                  <span>{session.context.length > 38 ? session.context.slice(0, 35) + "..." : session.context}</span>
                  <span className="session-card-date">{new Date(session.updatedAt).toLocaleDateString(locale)}</span>
                </div>
                <div className="session-card-subtitle">
                  {recordCount} {ui.stepsShort}
                  <span className="ml-8">{processBits}</span>
                </div>
                {session.studentArchivedAt && (
                  <div className="fs-12 mt-6" style={{ color: "#92400e" }}>
                    {ui.archivedByStudent}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import type { Child } from "@/lib/children-storage";
import { getChildDisplayName, getChildTechnicalLabel } from "@/lib/child-display";

interface TeacherChildHeaderUi {
  studentIdLabel: string;
  revealIdentity: string;
  hide: string;
  session: string;
  sessions: string;
  lastUpdate: string;
  deleteStudent: string;
  openPrototype: string;
  copyLinkBtn: string;
}

interface TeacherChildHeaderProps {
  selectedChild: Child;
  locale: string;
  revealIdentity: boolean;
  ui: TeacherChildHeaderUi;
  prototypeHref: string;
  onToggleIdentity: (nextValue: boolean) => void;
  onCopyLink: () => void;
  onDeleteChild: () => void;
}

export function TeacherChildHeader({
  selectedChild,
  locale,
  revealIdentity,
  ui,
  prototypeHref,
  onToggleIdentity,
  onCopyLink,
  onDeleteChild,
}: TeacherChildHeaderProps) {
  const displayName = getChildDisplayName(selectedChild);
  const technicalLabel = getChildTechnicalLabel(selectedChild);

  return (
    <div className="panel mb-16 child-header-panel">
      <div className="flex-row justify-between items-start gap-12 flex-wrap">
        <div>
          <div className="fs-11 c-muted tracking-wide">{ui.studentIdLabel}</div>
          <div className="fs-18 fw-700 mt-1">{displayName}</div>
          <div className="fs-12 c-muted font-mono mt-1">{technicalLabel}</div>

          {selectedChild.realData && (
            <div className="mt-6 fs-13">
              {revealIdentity ? (
                <span>
                  <strong>{selectedChild.realData.fio}</strong> · класс {selectedChild.realData.klass}
                  <button
                    className="button secondary"
                    onClick={() => onToggleIdentity(false)}
                    style={{ marginLeft: 10, fontSize: 11, padding: "1px 7px" }}
                  >
                    {ui.hide}
                  </button>
                </span>
              ) : (
                <button
                  className="button secondary"
                  onClick={() => onToggleIdentity(true)}
                  style={{ fontSize: 12, padding: "2px 9px" }}
                >
                  {ui.revealIdentity}
                </button>
              )}
            </div>
          )}

          <div className="mt-4 fs-13 c-muted">
            {selectedChild.sessions.length} {selectedChild.sessions.length === 1 ? ui.session : ui.sessions} · {ui.lastUpdate}{" "}
            {selectedChild.updatedAt ? new Date(selectedChild.updatedAt).toLocaleDateString(locale) : "—"}
          </div>
        </div>

        <div className="flex-col gap-6 items-end">
          <div className="flex-row gap-6 items-center flex-wrap">
            <Link
              href={prototypeHref}
              className="button secondary"
              target="_blank"
              style={{ padding: "7px 12px" }}
            >
              {ui.openPrototype}
            </Link>
            <button className="button secondary" onClick={onCopyLink} style={{ padding: "7px 10px" }}>
              {ui.copyLinkBtn}
            </button>
          </div>

          <button onClick={onDeleteChild} className="button secondary delete-student-btn">
            {ui.deleteStudent}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import type { Child } from "@/lib/children-storage";

interface TeacherSidebarUi {
  students: string;
  copyAllLinks: string;
  searchPlaceholder: string;
  session: string;
  sessions: string;
  hasRealData: string;
  openPrototype: string;
  start: string;
  copyLink: string;
  copied: string;
  addNamePlaceholder: string;
  addChild: string;
  storageLabel: string;
  noResults: string;
}

interface TeacherSidebarProps {
  childItems: Child[];
  visibleChildren: Child[];
  selectedChildId: string | null;
  copiedChildId: string | null;
  revealIdentity: boolean;
  childSearch: string;
  locale: string;
  ui: TeacherSidebarUi;
  onSearchChange: (value: string) => void;
  onCopyAllLinks: () => void;
  onSelectChild: (childId: string) => void;
  onCopyChildLink: (child: Child) => void;
  onAddChild: (name: string) => Promise<void>;
  buildPrototypeHref: (child: Child) => string;
}

export function TeacherSidebar({
  childItems,
  visibleChildren,
  selectedChildId,
  copiedChildId,
  revealIdentity,
  childSearch,
  locale,
  ui,
  onSearchChange,
  onCopyAllLinks,
  onSelectChild,
  onCopyChildLink,
  onAddChild,
  buildPrototypeHref,
}: TeacherSidebarProps) {
  const [newChildName, setNewChildName] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = newChildName.trim();
    if (!trimmedName) return;

    await onAddChild(trimmedName);
    setNewChildName("");
  }

  return (
    <aside className="dashboard-sidebar">
      <div className="panel sidebar-sticky">
        <div className="flex-row items-center justify-between mb-10">
          <div>
            <strong className="fs-15">{ui.students}</strong>
            <span className="muted fs-12 ml-6">({childItems.length})</span>
          </div>
          <button className="button secondary" onClick={onCopyAllLinks} style={{ fontSize: 11, padding: "4px 9px" }} title={ui.copyAllLinks}>
            {ui.copyAllLinks}
          </button>
        </div>

        <input
          type="text"
          placeholder={ui.searchPlaceholder}
          value={childSearch}
          onChange={(event) => onSearchChange(event.target.value)}
          className="w-full fs-13 mb-10 sidebar-search"
        />

        <div className="children-list-scroll">
          {visibleChildren.length === 0 && (
            <div className="muted fs-13" style={{ padding: "12px 0" }}>{ui.noResults}</div>
          )}

          {visibleChildren.map((child) => {
            const isActive = selectedChildId === child.id;
            const sessionCount = child.sessions?.length || 0;
            const lastUpdated = child.updatedAt ? new Date(child.updatedAt).toLocaleDateString(locale) : "-";

            return (
              <div
                key={child.id}
                onClick={() => onSelectChild(child.id)}
                className="child-item-card"
                style={{
                  border: isActive ? "1.5px solid var(--accent)" : "1px solid var(--line)",
                  background: isActive ? "var(--soft)" : "white",
                }}
              >
                <div className="child-item-top">
                  <div style={{ minWidth: 0 }}>
                    <div className="child-item-id" style={{ color: isActive ? "var(--accent)" : "var(--text)" }}>
                      {child.id}
                    </div>
                    <div className="child-item-meta">
                      {sessionCount} {sessionCount === 1 ? ui.session : ui.sessions} · {lastUpdated}
                    </div>

                    {child.realData && (
                      <div className="child-item-realdata">
                        {revealIdentity ? `${child.realData.fio} · ${child.realData.klass}` : ui.hasRealData}
                      </div>
                    )}
                  </div>

                  <div className="child-item-actions" onClick={(event) => event.stopPropagation()}>
                    <Link
                      href={buildPrototypeHref(child)}
                      className="button"
                      target="_blank"
                      style={{ fontSize: 10, padding: "1px 6px", minHeight: 24 }}
                      title={ui.openPrototype}
                    >
                      {ui.start}
                    </Link>
                    <button
                      className="button secondary"
                      onClick={() => onCopyChildLink(child)}
                      style={{ fontSize: 11, padding: "1px 6px", minHeight: 24 }}
                      title={ui.copyLink}
                    >
                      {copiedChildId === child.id ? ui.copied : "📋"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="flex-row gap-6 flex-wrap">
          <input
            name="childName"
            type="text"
            value={newChildName}
            onChange={(event) => setNewChildName(event.target.value)}
            placeholder={ui.addNamePlaceholder}
            className="fs-13 add-child-input"
          />
          <button type="submit" className="button secondary fs-12 whitespace-nowrap" style={{ padding: "6px 10px" }}>
            {ui.addChild}
          </button>
        </form>
        <div className="muted fs-11 mt-6 text-center">
          {ui.storageLabel}
        </div>
      </div>
    </aside>
  );
}

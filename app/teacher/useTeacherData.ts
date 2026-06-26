"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { withLang, type AppLang } from "@/lib/app-i18n";
import { createChildId, type Child, type Session } from "@/lib/children-storage";
import { DataService } from "@/lib/data-service";
import type { TeacherAnalytics } from "@/lib/server-storage";
import {
  createSampleSession,
  getScenarioDistribution,
  getStageSupport,
} from "@/lib/teacher-dashboard-analytics";

const DASHBOARD_STATE_KEY = "selfreg_dashboard_state";
const ONBOARDING_SEEN_KEY = "selfreg_onboarding_seen_teacher";

interface UseTeacherDataOptions {
  lang: AppLang;
  locale: string;
  teacherIdFromUrl?: string;
  serverBackedDashboard: boolean;
}

export function useTeacherData({
  lang,
  locale,
  teacherIdFromUrl,
  serverBackedDashboard,
}: UseTeacherDataOptions) {
  const [selectedSessionIdx, setSelectedSessionIdx] = useState(0);
  const [newSessionHint, setNewSessionHint] = useState<{ context: string } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [revealIdentity, setRevealIdentity] = useState(false);
  const [childSearch, setChildSearch] = useState("");
  const [newSessionContextInput, setNewSessionContextInput] = useState("");
  const [highlightedSessionUpdatedAt, setHighlightedSessionUpdatedAt] = useState<string | null>(null);
  const [copiedChildId, setCopiedChildId] = useState<string | null>(null);
  const [lastDeleted, setLastDeleted] = useState<{ childId: string; session: Session } | null>(null);
  const [analytics, setAnalytics] = useState<TeacherAnalytics | null>(null);
  const dashboardTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const selectedChild = useMemo(
    () => children.find((child) => child.id === selectedChildId) || children[0] || null,
    [children, selectedChildId]
  );

  function scheduleDashboardTimeout(callback: () => void, delay: number) {
    const timeoutId = setTimeout(() => {
      dashboardTimeoutsRef.current = dashboardTimeoutsRef.current.filter((id) => id !== timeoutId);
      callback();
    }, delay);
    dashboardTimeoutsRef.current.push(timeoutId);
  }

  function closeOnboarding() {
    localStorage.setItem(ONBOARDING_SEEN_KEY, "1");
    setShowOnboarding(false);
  }

  useEffect(() => {
    queueMicrotask(() => {
      const seen = localStorage.getItem(ONBOARDING_SEEN_KEY);
      if (!seen) {
        setShowOnboarding(true);
      }
    });
  }, []);

  useEffect(() => {
    return () => {
      dashboardTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      dashboardTimeoutsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (selectedChild) {
      const maxIdx = Math.max(0, selectedChild.sessions.length - 1);
      if (selectedSessionIdx > maxIdx) {
        queueMicrotask(() => setSelectedSessionIdx(0));
      }
    }

    queueMicrotask(() => {
      setNewSessionHint(null);
      setRevealIdentity(false);
    });
  }, [selectedChild, selectedSessionIdx]);

  useEffect(() => {
    if (selectedChildId == null) {
      return;
    }

    localStorage.setItem(
      DASHBOARD_STATE_KEY,
      JSON.stringify({
        childId: selectedChildId,
        sessionIdx: selectedSessionIdx,
      })
    );
  }, [selectedChildId, selectedSessionIdx]);

  useEffect(() => {
    if (!serverBackedDashboard) {
      return;
    }

    let active = true;

    const loadServerChildren = async () => {
      try {
        const query = teacherIdFromUrl
          ? `?teacherId=${encodeURIComponent(teacherIdFromUrl)}&analytics=true`
          : "";
        const response = await fetch(`/api/teacher-data${query}`, { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const payload = await response.json();
        if (!active || !Array.isArray(payload?.children)) {
          return;
        }

        const serverChildren = payload.children as Child[];
        setChildren(serverChildren);
        setAnalytics(payload.analytics ? (payload.analytics as TeacherAnalytics) : null);

        let restoredChildId: string | null = null;
        let restoredSessionIdx = 0;

        try {
          const saved = localStorage.getItem(DASHBOARD_STATE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved) as { childId?: string; sessionIdx?: number };
            if (parsed.childId && serverChildren.some((child) => child.id === parsed.childId)) {
              restoredChildId = parsed.childId;
              restoredSessionIdx = Math.max(0, parsed.sessionIdx || 0);
            }
          }
        } catch {}

        if (restoredChildId) {
          setSelectedChildId(restoredChildId);
          setSelectedSessionIdx(restoredSessionIdx);
          return;
        }

        setSelectedChildId((current) => {
          if (current && serverChildren.some((child) => child.id === current)) {
            return current;
          }
          return serverChildren[0]?.id ?? null;
        });
      } catch {
        if (!active) {
          return;
        }

        setChildren([]);
        setSelectedChildId(null);
        setAnalytics(null);
      }
    };

    void loadServerChildren();

    return () => {
      active = false;
    };
  }, [serverBackedDashboard, teacherIdFromUrl]);

  useEffect(() => {
    if (serverBackedDashboard) {
      return;
    }

    let active = true;

    const loadLocalChildren = async () => {
      let loaded = await DataService.getChildren();

      if (loaded.length === 0) {
        const child1 = await DataService.saveChild({
          id: createChildId(),
          name: "Алексей Петров",
          sessions: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Child);
        await DataService.saveChild({
          id: createChildId(),
          name: "Мария Иванова",
          sessions: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Child);

        await DataService.saveSession(child1.id, createSampleSession(lang, locale));
        loaded = await DataService.getChildren();
      }

      const seen = new Set<string>();
      let hadDuplicates = false;
      loaded = loaded.map((child: Child) => {
        if (seen.has(child.id)) {
          hadDuplicates = true;
          return { ...child, id: createChildId() };
        }
        seen.add(child.id);
        return child;
      });

      if (hadDuplicates) {
        for (const child of loaded) {
          await DataService.saveChild(child);
        }
      }

      if (!active) {
        return;
      }

      queueMicrotask(() => {
        setChildren(loaded);

        let restoredChildId: string | null = null;
        let restoredSessionIdx = 0;
        try {
          const saved = localStorage.getItem(DASHBOARD_STATE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved) as { childId?: string; sessionIdx?: number };
            const savedChildId = parsed.childId;
            const childExists = loaded.some((child: Child) => child.id === savedChildId);

            if (savedChildId && childExists) {
              restoredChildId = savedChildId;
              restoredSessionIdx = Math.max(0, parsed.sessionIdx || 0);
            }
          }
        } catch {}

        setSelectedChildId((current) => {
          if (current && loaded.some((child: Child) => child.id === current)) {
            return current;
          }

          if (restoredChildId) {
            queueMicrotask(() => setSelectedSessionIdx(restoredSessionIdx));
            return restoredChildId;
          }

          queueMicrotask(() => setSelectedSessionIdx(0));
          return loaded[0]?.id ?? null;
        });
      });
    };

    void loadLocalChildren();

    return () => {
      active = false;
    };
  }, [serverBackedDashboard, lang, locale]);

  function createNewSessionForChild(customContext?: string) {
    if (!selectedChild) {
      return;
    }

    const context = customContext?.trim()
      ? customContext.trim()
      : `${selectedChild.name} — ${new Date().toLocaleDateString(locale)}`;

    const newSession: Session = {
      context,
      records: [],
      finalNote: "",
      updatedAt: new Date().toISOString(),
      lang,
      childId: selectedChild.id,
    };

    void (async () => {
      await DataService.saveSession(selectedChild.id, newSession);
      const updatedChildren = await DataService.getChildren();
      setChildren(updatedChildren);
    })();

    setSelectedSessionIdx(0);

    setHighlightedSessionUpdatedAt(newSession.updatedAt);
    scheduleDashboardTimeout(() => {
      setHighlightedSessionUpdatedAt(null);
    }, 2500);

    setNewSessionHint({ context: newSession.context });
    setLastDeleted(null);

    scheduleDashboardTimeout(() => {
      setNewSessionHint(null);
    }, 12000);
  }

  const distribution = useMemo(
    () =>
      selectedChild
        ? getScenarioDistribution(selectedChild.sessions)
        : { a: 0, b: 0, clarify: 0, skipped: 0, raw: { a: 0, b: 0, clarify: 0, skipped: 0, total: 0 } },
    [selectedChild]
  );

  const stageSupport = useMemo(
    () => (selectedChild ? getStageSupport(selectedChild.sessions) : []),
    [selectedChild]
  );

  const totalRecords = distribution.raw.total || 0;

  const visibleChildren = useMemo(
    () =>
      [...children]
        .sort((a, b) => {
          const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : new Date(a.createdAt).getTime();
          const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : new Date(b.createdAt).getTime();
          return timeB - timeA;
        })
        .filter((child) => {
          const query = childSearch.toLowerCase();
          if (!query) {
            return true;
          }
          if (child.id.toLowerCase().includes(query)) {
            return true;
          }
          if (child.realData) {
            return (
              child.realData.fio.toLowerCase().includes(query) ||
              child.realData.klass.toLowerCase().includes(query)
            );
          }
          return false;
        }),
    [children, childSearch]
  );

  const sortedSessions = useMemo(
    () =>
      selectedChild
        ? [...selectedChild.sessions].sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )
        : [],
    [selectedChild]
  );

  const currentSession = sortedSessions[selectedSessionIdx] || null;

  function selectChild(childId: string) {
    setSelectedChildId(childId);
    setSelectedSessionIdx(0);
    setNewSessionContextInput("");
    setNewSessionHint(null);
    setLastDeleted(null);
    setRevealIdentity(false);
  }

  function selectSession(index: number) {
    setSelectedSessionIdx(index);
    setNewSessionHint(null);
    setLastDeleted(null);
  }

  function deleteCurrentChild() {
    if (!selectedChild) {
      return;
    }
    if (!confirm(`Удалить ученика ${selectedChild.id} и все его сессии? Это необратимо.`)) {
      return;
    }

    void (async () => {
      if (serverBackedDashboard) {
        try {
          const teacherQuery = teacherIdFromUrl ? `&teacherId=${encodeURIComponent(teacherIdFromUrl)}` : "";
          await fetch(`/api/children?childId=${encodeURIComponent(selectedChild.id)}${teacherQuery}`, {
            method: "DELETE",
          });
        } catch {}
      }

      await DataService.deleteChild(selectedChild.id);
      const fresh = await DataService.getChildren();
      setChildren(fresh);
      setLastDeleted(null);
      setNewSessionHint(null);

      if (fresh.length > 0) {
        setSelectedChildId(fresh[0].id);
        setSelectedSessionIdx(0);
      } else {
        setSelectedChildId(null);
      }
    })();
  }

  function buildPrototypeHref(child: Child) {
    const teacherParam = child.teacherId || teacherIdFromUrl;
    const suffix = teacherParam ? `&teacher=${encodeURIComponent(teacherParam)}` : "";
    return withLang(`/adolescent?childId=${child.id}${suffix}`, lang);
  }

  function copyAllLinks() {
    const links = children.map((child) => `${window.location.origin}${buildPrototypeHref(child)}`).join("\n");
    navigator.clipboard.writeText(links);
    alert(`Скопировано ${children.length} ссылок`);
  }

  function copyChildLink(child: Child) {
    const link = `${window.location.origin}${buildPrototypeHref(child)}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedChildId(child.id);
      scheduleDashboardTimeout(() => setCopiedChildId(null), 1400);
    });
  }

  async function addChild(name: string) {
    let newChild: Child;

    if (serverBackedDashboard) {
      try {
        const response = await fetch("/api/children", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            teacherId: teacherIdFromUrl,
          }),
        });

        if (response.ok) {
          const payload = await response.json();
          if (payload?.child) {
            newChild = payload.child as Child;
            await DataService.saveChild(newChild);
            const updated = await DataService.getChildren();
            setChildren(updated);
            selectChild(newChild.id);
            return;
          }
        }
      } catch {}
    }

    newChild = {
      id: createChildId(),
      name,
      sessions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Child;
    await DataService.saveChild(newChild);
    const updated = await DataService.getChildren();
    setChildren(updated);
    selectChild(newChild.id);
  }

  function createNewSessionFromInput() {
    createNewSessionForChild(newSessionContextInput);
    setNewSessionContextInput("");
  }

  function deleteSelectedSession() {
    if (!selectedChild || !currentSession) {
      return;
    }
    if (!confirm("Удалить эту сессию?")) {
      return;
    }

    setLastDeleted({ childId: selectedChild.id, session: { ...currentSession } });

    void (async () => {
      await DataService.deleteSession(selectedChild.id, currentSession.updatedAt);
      const fresh = await DataService.getChildren();
      setChildren(fresh);
      setSelectedSessionIdx(0);
    })();

    scheduleDashboardTimeout(() => setLastDeleted(null), 12000);
  }

  function undoLastDelete() {
    if (!lastDeleted) {
      return;
    }

    void (async () => {
      await DataService.saveSession(lastDeleted.childId, lastDeleted.session);
      const fresh = await DataService.getChildren();
      setChildren(fresh);
      setLastDeleted(null);
      setSelectedSessionIdx(0);
    })();
  }

  function exportToCsv() {
    const rows: string[][] = [];
    rows.push(["ID", "Name", "Class", "Total Sessions", "Completed Sessions", "Last Activity", "Teacher ID"]);

    for (const child of children) {
      const totalSessions = child.sessions?.length || 0;
      const completedSessions =
        child.sessions?.filter((session) => session.status === "completed" || (session.finalNote && session.finalNote.trim()))
          .length || 0;
      const timestamps = child.sessions?.map((session) => session.updatedAt).filter(Boolean) as string[] | undefined;
      const lastActivity = timestamps && timestamps.length > 0 ? timestamps.sort().reverse()[0] ?? "" : "";

      rows.push([
        child.id,
        child.realData?.fio || child.name || "",
        child.realData?.klass || "",
        String(totalSessions),
        String(completedSessions),
        lastActivity ? new Date(lastActivity).toISOString() : "",
        child.teacherId || "",
      ]);
    }

    const csvContent = rows
      .map((row) =>
        row
          .map((cell) => {
            const escaped = cell.replace(/"/g, '""');
            return /[,"\n]/.test(cell) ? `"${escaped}"` : escaped;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `teacher-data-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return {
    showOnboarding,
    closeOnboarding,
    children,
    visibleChildren,
    selectedChildId,
    selectedChild,
    revealIdentity,
    childSearch,
    newSessionContextInput,
    copiedChildId,
    highlightedSessionUpdatedAt,
    newSessionHint,
    lastDeleted,
    analytics,
    distribution,
    stageSupport,
    totalRecords,
    sortedSessions,
    selectedSessionIdx,
    currentSession,
    setChildSearch,
    setRevealIdentity,
    setNewSessionContextInput,
    setNewSessionHint,
    selectChild,
    selectSession,
    createNewSessionForChild,
    createNewSessionFromInput,
    deleteCurrentChild,
    copyAllLinks,
    copyChildLink,
    addChild,
    buildPrototypeHref,
    deleteSelectedSession,
    undoLastDelete,
    exportToCsv,
  };
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LanguageToggle } from "@/app/components/LanguageToggle";
import { OnboardingModal } from "@/app/components/OnboardingModal";
import { normalizeAppLang, withLang } from "@/lib/app-i18n";
import { createChildId, type Child, type Session, type RecordItem } from "@/lib/children-storage";
import { DataService } from "@/lib/data-service";
import { inferRecordEventType } from "@/lib/session-helpers";
import { isRetryRecord } from "@/lib/selfreg-flow-machine";
import ClassStats from "@/components/analytics/ClassStats";
import ProgressChart from "@/components/analytics/ProgressChart";
import type { TeacherAnalytics } from "@/lib/server-storage";
import { TeacherSidebar } from "@/app/teacher/TeacherSidebar";
import {
  createSampleSession,
  getRecordEventLabel,
  getResponseModeLabel,
  getScenarioDistribution,
  getSessionSignals,
  getSessionStatus,
  getStageSupport,
  getTrajectoryNote,
} from "@/lib/teacher-dashboard-analytics";

// Устаревший ключ — оставлен только для совместимости при миграции

export function TeacherDashboard() {
  const searchParams = useSearchParams();
  const lang = normalizeAppLang(searchParams.get("lang"));
  const teacherIdFromUrl = searchParams.get("teacher") || undefined;
  const locale = lang === "en" ? "en-US" : "ru-RU";
  const serverBackedDashboard = Boolean(teacherIdFromUrl);

  // Выбранная сессия внутри выбранного ребёнка (по индексу после сортировки)
  const [selectedSessionIdx, setSelectedSessionIdx] = useState(0);

  // Показывать ли подсказку после создания новой сессии
  const [newSessionHint, setNewSessionHint] = useState<{ context: string } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Onboarding check on first visit
  useEffect(() => {
    queueMicrotask(() => {
      const seen = localStorage.getItem("selfreg_onboarding_seen_teacher");
      if (!seen) setShowOnboarding(true);
    });
  }, []);

  const DASHBOARD_STATE_KEY = "selfreg_dashboard_state";

  const ui = useMemo(() => ({
    eyebrow: lang === "en" ? "Teacher dashboard" : "Дашборд педагога",
    title: lang === "en" ? "Students overview + infographics" : "Обзор учеников + инфографика",
    intro:
      lang === "en"
        ? "Database of children with visual analytics of self-regulation support patterns across sessions."
        : "База детей с визуальной аналитикой паттернов поддержки саморегуляции по сессиям.",
    introSubtitle:
      lang === "en"
        ? "This tool is designed for educators and psychologists working with adolescents."
        : "Этот инструмент предназначен для педагогов и психологов, работающих с подростками.",
    home: lang === "en" ? "Home" : "Главная",
    prototype: lang === "en" ? "Run prototype" : "Пройти прототип",
    students: lang === "en" ? "Students" : "Ученики",
    searchPlaceholder:
      lang === "en"
        ? "Search by ID, name or class..."
        : "Поиск по ID, ФИО или классу...",
    sessions: lang === "en" ? "sessions" : "сессий",
    session: lang === "en" ? "session" : "сессия",
    lastUpdate: lang === "en" ? "last update" : "последнее обновление",
    hasRealData: lang === "en" ? "has real data" : "есть реальные данные",
    start: lang === "en" ? "Start" : "Старт",
    copyLink: lang === "en" ? "Copy link" : "Скопировать ссылку",
    copied: lang === "en" ? "✓" : "✓",
    copyAllLinks: lang === "en" ? "📋 Copy all links" : "📋 Все ссылки",
    addNamePlaceholder:
      lang === "en" ? "Name / alias" : "Имя / псевдоним",
    addChild: lang === "en" ? "+ Add" : "+ Добавить",
    noResults: lang === "en" ? "Nothing found" : "Ничего не найдено",
    storageLabel: serverBackedDashboard
      ? (lang === "en" ? "Supabase · server sync active" : "Supabase · серверная синхронизация активна")
      : (lang === "en" ? "localStorage · ready for migration" : "localStorage · готово к миграции"),
    selectStudentLeft:
      lang === "en" ? "Select a student from the left" : "Выберите ученика слева",
    selectStudentLeftDesc:
      lang === "en"
        ? "Or add a new one to start working with the database."
        : "Или добавьте нового, чтобы начать работу с базой.",
    studentIdLabel: lang === "en" ? "STUDENT ID" : "ID УЧЕНИКА",
    revealIdentity: lang === "en" ? "Reveal name and class" : "Раскрыть ФИО и класс",
    hide: lang === "en" ? "Hide" : "Скрыть",
    newSession: lang === "en" ? "+ New session" : "+ Новая сессия",
    openPrototype: lang === "en" ? "Open prototype" : "Открыть прототип",
    copyLinkBtn: lang === "en" ? "📋 Link" : "📋 Ссылка",
    deleteStudent: lang === "en" ? "Delete student" : "Удалить ученика",
    analyticsTitle:
      lang === "en"
        ? "Aggregated analytics (all student sessions)"
        : "Агрегированная аналитика (все сессии ученика)",
    scenarioDistribution:
      lang === "en" ? "Support type distribution" : "Распределение типов поддержки",
    processEvents:
      lang === "en" ? "Process events" : "События процесса",
    scenarioA: lang === "en" ? "Scenario A" : "Сценарий A",
    scenarioB: lang === "en" ? "Scenario B" : "Сценарий B",
    clarification: lang === "en" ? "Clarifications" : "Уточнения",
    clarificationQuestion: lang === "en" ? "Question was unclear" : "Вопрос был непонятен",
    returnToQuestion: lang === "en" ? "Returned to previous question" : "Вернулся к предыдущему вопросу",
    retryAnswer: lang === "en" ? "Repeated attempt after clarification" : "Повторная попытка после уточнения",
    skipped: lang === "en" ? "Skipped" : "Пропущено",
    totalRecords: lang === "en" ? "Total records:" : "Всего записей:",
    stageSupportTitle:
      lang === "en" ? "Support need by stage" : "Нужда в поддержке по этапам",
    stage: lang === "en" ? "Stage" : "Этап",
    stepsShort: lang === "en" ? "steps" : "шагов",
    records: lang === "en" ? "records" : "записей",
    questionLabel: lang === "en" ? "Question:" : "Вопрос:",
    answerLabel: lang === "en" ? "Adolescent answer:" : "Ответ подростка:",
    supportLabel: lang === "en" ? "Support:" : "Поддержка:",
    sessionSignals: lang === "en" ? "What happened in this session" : "Что произошло в этой сессии",
    trajectoryNote: (signals: ReturnType<typeof getSessionSignals>) => getTrajectoryNote(signals, lang),
    noSpecialSignals:
      lang === "en"
        ? "No clarifications or returns were recorded in this session."
        : "В этой сессии не было уточнений или возвратов к вопросу.",
    signalCount: (label: string, count: number) =>
      lang === "en" ? `${label}: ${count}` : `${label}: ${count}`,
    eventLabel: (record: RecordItem) => getRecordEventLabel(record, lang),
    aiSourceLabel: lang === "en" ? "AI source:" : "Источник ИИ:",
    responseModeLabel: (mode: RecordItem["responseMode"]) => getResponseModeLabel(mode, lang),
    noStageData: lang === "en" ? "No stage data yet" : "Пока нет данных по этапам",
    sessionsLabel: lang === "en" ? "Sessions" : "Сессии",
    createNewSession: lang === "en" ? "+ New session" : "+ Новая сессия",
    deleteSelected: lang === "en" ? "Delete selected" : "Удалить выбранную",
    newSessionHint:
      lang === "en"
        ? 'Session "{context}" created. Ready to use.'
        : 'Сессия «{context}» создана. Готова к работе.',
    sessionDeleted: lang === "en" ? "Session deleted." : "Сессия удалена.",
    undoDelete: lang === "en" ? "Undo deletion" : "Отменить удаление",
    noSessions: lang === "en" ? "Student has no sessions yet." : "У ученика пока нет сессий.",
    createFirstSession:
      lang === "en" ? "Create first session" : "Создать первую сессию",
    selectSessionAbove:
      lang === "en" ? "Select a session above to see details." : "Выберите сессию выше, чтобы увидеть детали.",
    emptySession:
      lang === "en"
        ? "Session is empty. Open the prototype using the link above and complete the cycle - results will appear here automatically."
        : "Сессия пока пустая. Откройте прототип по ссылке выше и пройдите цикл — результаты появятся здесь автоматически.",
    scenarioLabel: (s: string) =>
      s === "clarify"
        ? (lang === "en" ? "Clarification" : "Уточнение")
        : s === "skipped"
        ? (lang === "en" ? "Skipped" : "Пропущено")
        : lang === "en"
        ? `Scenario ${s}`
        : `Сценарий ${s}`,
    finalInterpretation:
      lang === "en" ? "Final session interpretation" : "Итоговая интерпретация сессии",
    aiInsightTitle:
      lang === "en"
        ? "AI insight based on previous sessions (seen by adolescent)"
        : "Комментарий ИИ на основе предыдущих сессий (видел подросток)",
    adolescentFeedback:
      lang === "en" ? "Adolescent feedback" : "Обратная связь подростка",
    usefulness: (rating: number) =>
      lang === "en" ? `(usefulness: ${rating}/5)` : `(полезность: ${rating}/5)`,
  }), [lang, serverBackedDashboard]);

  // === Используем централизованное хранилище детей ===
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

  const selectedChild = children.find(c => c.id === selectedChildId) || children[0];

  function scheduleDashboardTimeout(callback: () => void, delay: number) {
    const timeoutId = setTimeout(() => {
      dashboardTimeoutsRef.current = dashboardTimeoutsRef.current.filter((id) => id !== timeoutId);
      callback();
    }, delay);
    dashboardTimeoutsRef.current.push(timeoutId);
  }

  useEffect(() => {
    return () => {
      dashboardTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      dashboardTimeoutsRef.current = [];
    };
  }, []);

  // После того как выбран ребёнок, убеждаемся что индекс сессии валиден
  useEffect(() => {
    if (selectedChild) {
      const maxIdx = Math.max(0, selectedChild.sessions.length - 1);
      if (selectedSessionIdx > maxIdx) {
        queueMicrotask(() => setSelectedSessionIdx(0));
      }
    }
    // Скрываем подсказку и реальные данные при смене ребёнка
    queueMicrotask(() => {
      setNewSessionHint(null);
      setRevealIdentity(false);
    });
  }, [selectedChild, selectedSessionIdx]);

  // === Persist dashboard state (last child + last session index) ===
  useEffect(() => {
    if (selectedChildId != null) {
      const state = { 
        childId: selectedChildId, 
        sessionIdx: selectedSessionIdx 
      };
      localStorage.setItem(DASHBOARD_STATE_KEY, JSON.stringify(state));
    }
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
        if (!response.ok) return;

        const payload = await response.json();
        if (!active || !Array.isArray(payload?.children)) return;

        const serverChildren = payload.children as Child[];
        setChildren(serverChildren);

        // Set analytics if available
        if (payload.analytics) {
          setAnalytics(payload.analytics as TeacherAnalytics);
        } else {
          setAnalytics(null);
        }

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
        if (!active) return;
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
    if (serverBackedDashboard) return;

    let active = true;

    const loadLocalChildren = async () => {
      let loaded = await DataService.getChildren();

      // Если база пустая — создаём демо (ТОЛЬКО если данных нет вообще)
      if (loaded.length === 0) {
        const child1 = await DataService.saveChild({
          id: createChildId(),
          name: "Алексей Петров",
          sessions: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Child);
        const child2 = await DataService.saveChild({
          id: createChildId(),
          name: "Мария Иванова",
          sessions: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Child);

        // Добавляем демо-сессию первому ребёнку
        await DataService.saveSession(child1.id, createSampleSession(lang, locale));

        loaded = await DataService.getChildren();
      }

      // Defensive: если по какой-то причине есть дубликаты ID (legacy data), регенерируем их
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

      if (!active) return;

      queueMicrotask(() => {
        setChildren(loaded);

        // Восстанавливаем последнее состояние из localStorage, если оно валидно
        let restored = false;
        try {
          const saved = localStorage.getItem(DASHBOARD_STATE_KEY);
          if (saved) {
            const { childId: savedChildId, sessionIdx: savedSessionIdx } = JSON.parse(saved);

            const childExists = loaded.some((c: Child) => c.id === savedChildId);
            if (childExists) {
              setSelectedChildId(savedChildId);
              setSelectedSessionIdx(Math.max(0, savedSessionIdx || 0));
              restored = true;
            }
          }
        } catch {}

        if (!restored && loaded.length > 0) {
          setSelectedChildId(loaded[0].id);
        }
      });
    };

    void loadLocalChildren();

    return () => {
      active = false;
    };
  }, [serverBackedDashboard, lang, locale]);

  // === Создать новую пустую сессию для текущего ребёнка ===
  function createNewSessionForChild(customContext?: string) {
    if (!selectedChild) return;

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

      // Обновляем локальное состояние
      const updatedChildren = await DataService.getChildren();
      setChildren(updatedChildren);
    })();

    // Переключаемся на самую свежую сессию
    setSelectedSessionIdx(0);

    // Временно подсвечиваем новую сессию
    const newUpdatedAt = newSession.updatedAt;
    setHighlightedSessionUpdatedAt(newUpdatedAt);

    // Автоматически убираем подсветку через 2.5 секунды
    scheduleDashboardTimeout(() => {
      setHighlightedSessionUpdatedAt(null);
    }, 2500);

    // Показываем умную подсказку с контекстом сессии
    setNewSessionHint({ context: newSession.context });
    setLastDeleted(null); // скрываем undo при создании новой

    // Авто-скрытие подсказки через 12 секунд
    scheduleDashboardTimeout(() => {
      setNewSessionHint(null);
    }, 12000);
  }

  // === UI helpers for the new coherent dashboard ===
  const getScenarioColor = (s: "A" | "B" | "clarify" | "skipped") =>
    s === "A" ? "var(--accent)" : s === "B" ? "var(--orange)" : s === "clarify" ? "var(--green)" : "var(--muted)";

  const getEventBadgeStyle = (record: RecordItem) => {
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
  };

  // Recompute derived data (safe even if no child)
  const distribution = selectedChild
    ? getScenarioDistribution(selectedChild.sessions)
    : { a: 0, b: 0, clarify: 0, skipped: 0, raw: { a: 0, b: 0, clarify: 0, skipped: 0, total: 0 } } as any;

  const stageSupport = selectedChild ? getStageSupport(selectedChild.sessions) : [];

  const totalRecords = distribution.raw.total || 0;

  // Children list for sidebar (most recently active first + search)
  const visibleChildren = [...children]
    .sort((a, b) => {
      const tA = a.updatedAt ? new Date(a.updatedAt).getTime() : new Date(a.createdAt).getTime();
      const tB = b.updatedAt ? new Date(b.updatedAt).getTime() : new Date(b.createdAt).getTime();
      return tB - tA;
    })
    .filter((c) => {
      const q = childSearch.toLowerCase();
      if (!q) return true;
      if (c.id.toLowerCase().includes(q)) return true;
      if (c.realData) {
        return c.realData.fio.toLowerCase().includes(q) || c.realData.klass.toLowerCase().includes(q);
      }
      return false;
    });

  // Sessions for the selected child, newest first
  const sortedSessions = selectedChild
    ? [...selectedChild.sessions].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    : [];
  const currentSession = sortedSessions[selectedSessionIdx] || null;
  const currentSessionSignals = currentSession
    ? getSessionSignals(currentSession.records)
    : { clarifications: 0, returns: 0, retries: 0, skips: 0, progress: 0, completedStages: 0, isComplete: false };

  // === Handlers for the new layout ===
  function selectChild(id: string) {
    setSelectedChildId(id);
    setSelectedSessionIdx(0);
    setNewSessionContextInput("");
    setNewSessionHint(null);
    setLastDeleted(null);
    setRevealIdentity(false);
  }

  function deleteCurrentChild() {
    if (!selectedChild) return;
    if (!confirm(`Удалить ученика ${selectedChild.id} и все его сессии? Это необратимо.`)) return;

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
    const links = children
      .map((c) => `${window.location.origin}${buildPrototypeHref(c)}`)
      .join("\n");
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
    if (!selectedChild || !currentSession) return;
    if (!confirm("Удалить эту сессию?")) return;

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
    if (!lastDeleted) return;

    void (async () => {
      await DataService.saveSession(lastDeleted.childId, lastDeleted.session);
      const fresh = await DataService.getChildren();
      setChildren(fresh);
      setLastDeleted(null);
      setSelectedSessionIdx(0);
    })();
  }

  // === CSV Export ===
  function exportToCsv() {
    const rows: string[][] = [];
    // Header
    rows.push(["ID", "Name", "Class", "Total Sessions", "Completed Sessions", "Last Activity", "Teacher ID"]);

    for (const child of children) {
      const totalSessions = child.sessions?.length || 0;
      const completedSessions = child.sessions?.filter(
        (s) => s.status === "completed" || (s.finalNote && s.finalNote.trim())
      ).length || 0;
      const timestamps = child.sessions?.map((s) => s.updatedAt).filter(Boolean) as string[] | undefined;
      const lastActivity = timestamps && timestamps.length > 0
        ? timestamps.sort().reverse()[0] ?? ""
        : "";

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
            // Escape quotes and wrap in quotes if contains comma or quote
            const escaped = cell.replace(/"/g, '""');
            return /[,"\n]/.test(cell) ? `"${escaped}"` : escaped;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `teacher-data-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="shell">
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => {
          localStorage.setItem("selfreg_onboarding_seen_teacher", "1");
          setShowOnboarding(false);
        }}
        lang={lang}
        type="teacher"
      />
      {/* Top bar — unchanged, professional */}
      <div className="topbar app-header">
        <div>
          <p className="eyebrow">{ui.eyebrow}</p>
          <h1>{ui.title}</h1>
          <p className="muted">{ui.intro}</p>
          <p className="mt-8 fs-13 c-muted">
            {ui.introSubtitle}
          </p>
        </div>
        <div className="action-row">
          <LanguageToggle />
          <button className="button secondary" onClick={exportToCsv} style={{ fontSize: 13, padding: "6px 12px" }}>
            {lang === "en" ? "📥 CSV Export" : "📥 CSV экспорт"}
          </button>
          <Link className="button secondary" href={withLang("/", lang)}>
            {ui.home}
          </Link>
          <Link className="button" href={withLang("/adolescent", lang)}>
            {ui.prototype}
          </Link>
        </div>
      </div>

      {/* === NEW COHERENT DASHBOARD: left children + main (header + infographics + sessions + detail) === */}
      <div className="dashboard-layout">
        <TeacherSidebar
          childItems={children}
          visibleChildren={visibleChildren}
          selectedChildId={selectedChildId}
          copiedChildId={copiedChildId}
          revealIdentity={revealIdentity}
          childSearch={childSearch}
          locale={locale}
          ui={ui}
          onSearchChange={setChildSearch}
          onCopyAllLinks={copyAllLinks}
          onSelectChild={selectChild}
          onCopyChildLink={copyChildLink}
          onAddChild={addChild}
          buildPrototypeHref={buildPrototypeHref}
        />

        {/* MAIN AREA */}
        <div className="dashboard-main">
          {!selectedChild ? (
            <div className="panel text-center no-selection-panel">
              <h3 className="mt-0">{ui.selectStudentLeft}</h3>
              <p className="muted">{ui.selectStudentLeftDesc}</p>
            </div>
          ) : (
            <>
              {/* CHILD HEADER + QUICK ACTIONS */}
              <div className="panel mb-16 child-header-panel">
                <div className="flex-row justify-between items-start gap-12 flex-wrap">
                  <div>
                    <div className="fs-11 c-muted tracking-wide">{ui.studentIdLabel}</div>
                    <div className="fs-18 fw-700 font-mono mt-1">{selectedChild.id}</div>

                    {/* Real identity reveal (privacy-first) */}
                    {selectedChild.realData && (
                      <div className="mt-6 fs-13">
                        {revealIdentity ? (
                          <span>
                            <strong>{selectedChild.realData.fio}</strong> · класс {selectedChild.realData.klass}
                            <button className="button secondary" onClick={() => setRevealIdentity(false)} style={{ marginLeft: 10, fontSize: 11, padding: "1px 7px" }}>
                              {ui.hide}
                            </button>
                          </span>
                        ) : (
                          <button className="button secondary" onClick={() => setRevealIdentity(true)} style={{ fontSize: 12, padding: "2px 9px" }}>
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

                  {/* Quick actions bar */}
                  <div className="flex-col gap-6 items-end">
                    <div className="flex-row gap-6 items-center flex-wrap">
                      <input
                        type="text"
                        value={newSessionContextInput}
                        onChange={(e) => setNewSessionContextInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") createNewSessionFromInput(); }}
                        placeholder="Контекст новой сессии (учёба, спорт...)"
                        className="fs-13 session-context-input"
                      />
                      <button className="button" onClick={createNewSessionFromInput} style={{ padding: "7px 14px" }}>
                        + Новая сессия
                      </button>
                      <Link
                        href={buildPrototypeHref(selectedChild)}
                        className="button secondary"
                        target="_blank"
                        style={{ padding: "7px 12px" }}
                      >
                        Открыть прототип
                      </Link>
                      <button className="button secondary" onClick={() => copyChildLink(selectedChild)} style={{ padding: "7px 10px" }}>
                        📋 Ссылка
                      </button>
                    </div>

                      <button
                        onClick={deleteCurrentChild}
                        className="button secondary delete-student-btn"
                      >
                        {ui.deleteStudent}
                      </button>
                  </div>
                </div>
              </div>

              {/* AGGREGATED INFOGRAPHICS */}
              <div className="panel mb-16">
                <h3 className="fs-15 analytics-section-title">{ui.analyticsTitle}</h3>

                <div className="analytics-inner-grid">
                  {/* Scenario distribution */}
                  <div>
                    <div className="fs-12 c-muted mb-6">{ui.scenarioDistribution}</div>
                    <div className="progress-track">
                      <div style={{ width: `${distribution.a}%`, background: "var(--accent)" }} title={`${ui.scenarioA}: ${distribution.a}%`} />
                      <div style={{ width: `${distribution.b}%`, background: "var(--orange)" }} title={`${ui.scenarioB}: ${distribution.b}%`} />
                    </div>
                    <div className="flex-row gap-14 mt-6 fs-13">
                      <span><span className="c-accent">●</span> {ui.scenarioA}: <strong>{distribution.a}%</strong> ({distribution.raw.a})</span>
                      <span><span className="c-orange">●</span> {ui.scenarioB}: <strong>{distribution.b}%</strong> ({distribution.raw.b})</span>
                      {distribution.raw.skipped > 0 && (
                        <span className="c-muted">{ui.skipped}: <strong>{distribution.raw.skipped}</strong></span>
                      )}
                    </div>
                    <div className="flex-row gap-10 mt-8 fs-12 c-muted flex-wrap">
                      <span>{ui.processEvents}:</span>
                      <span>{ui.clarification}: <strong>{distribution.raw.clarify}</strong></span>
                    </div>
                    <div className="muted fs-11 mt-2">{ui.totalRecords} {totalRecords}</div>
                  </div>

                  {/* Per-stage support */}
                  <div>
                    <div className="fs-12 c-muted mb-6">{ui.stageSupportTitle}</div>
                    {stageSupport.length > 0 ? (
                      stageSupport.map((s) => {
                        const sum = (s.A + s.B + s.clarify) || 1;
                        return (
                          <div key={s.stageId} className="mb-5">
                            <div className="fs-12 mb-1 flex-row justify-between">
                              <span>{ui.stage} {s.stageId}</span>
                              <span className="muted fs-11">{s.A + s.B + s.clarify} {ui.records}</span>
                            </div>
                            <div className="stage-bar-track">
                              <div style={{ width: `${(s.A / sum) * 100}%`, background: "var(--accent)" }} />
                              <div style={{ width: `${(s.B / sum) * 100}%`, background: "var(--orange)" }} />
                            </div>
                            {s.clarify > 0 && (
                              <div className="muted" style={{ fontSize: 11, marginTop: 1 }}>
                                {ui.clarification}: {s.clarify}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="muted no-stage-data">{ui.noStageData}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* SERVER ANALYTICS PANEL (only when server-backed) */}
              {serverBackedDashboard && analytics && (
                <div className="analytics-panel">
                  <div className="analytics-grid-2col">
                    <ClassStats
                      data={analytics.classDistribution}
                      title={lang === "en" ? "Class Distribution" : "Распределение по классам"}
                    />
                    <div>
                      <div className="stat-card-white">
                        <h3 className="stat-card-title">
                          {lang === "en" ? "Overall Statistics" : "Общая статистика"}
                        </h3>
                        <div className="stat-grid-2col">
                          <div className="stat-item" style={{ background: "#f0f7ff" }}>
                            <div className="stat-value" style={{ color: "var(--accent)" }}>{analytics.totalChildren}</div>
                            <div className="stat-label">
                              {lang === "en" ? "Students" : "Учеников"}
                            </div>
                          </div>
                          <div className="stat-item" style={{ background: "#f0fdf4" }}>
                            <div className="stat-value" style={{ color: "#10b981" }}>{analytics.totalSessions}</div>
                            <div className="stat-label">
                              {lang === "en" ? "Sessions" : "Сессий"}
                            </div>
                          </div>
                          <div className="stat-item" style={{ background: "#fffbeb" }}>
                            <div className="stat-value" style={{ color: "#f59e0b" }}>{analytics.totalCompletedSessions}</div>
                            <div className="stat-label">
                              {lang === "en" ? "Completed" : "Завершено"}
                            </div>
                          </div>
                          <div className="stat-item" style={{ background: "#f5f3ff" }}>
                            <div className="stat-value" style={{ color: "#8b5cf6" }}>
                              {analytics.totalSessions > 0
                                ? Math.round((analytics.totalCompletedSessions / analytics.totalSessions) * 100)
                                : 0}%
                            </div>
                            <div className="stat-label">
                              {lang === "en" ? "Completion rate" : "Завершение"}
                            </div>
                          </div>
                        </div>
                      </div>
                      <ProgressChart
                        data={analytics.studentProgress.map((sp) => ({
                          totalSessions: sp.totalSessions,
                          completedSessions: sp.completedSessions,
                          lastActivity: sp.lastActivity ?? undefined,
                        }))}
                        title={lang === "en" ? "Student Progress" : "Прогресс учеников"}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SESSIONS LIST */}
              <div className="panel mb-16">
                <div className="sessions-header">
                  <div>
                    <strong className="fs-15">{ui.sessionsLabel}</strong>
                    <span className="muted sessions-count">({sortedSessions.length})</span>
                  </div>
                  <div className="session-actions">
                    <button className="button" onClick={createNewSessionFromInput} style={{ fontSize: 13, padding: "6px 12px" }}>{ui.createNewSession}</button>
                    {currentSession && (
                      <button className="button secondary" onClick={deleteSelectedSession} style={{ fontSize: 13, padding: "6px 12px" }}>
                        {ui.deleteSelected}
                      </button>
                    )}
                  </div>
                </div>

                {/* New session hint */}
                {newSessionHint && (
                  <div className="hint-bar">
                    <span>{ui.newSessionHint.replace("{context}", newSessionHint.context)}</span>
                    <Link href={buildPrototypeHref(selectedChild)} className="button" target="_blank" style={{ fontSize: 12, padding: "3px 9px" }} onClick={() => setNewSessionHint(null)}>
                      {ui.openPrototype}
                    </Link>
                  </div>
                )}

                {/* Undo bar */}
                {lastDeleted && (
                  <div className="undo-bar">
                    <span>{ui.sessionDeleted}</span>
                    <button className="button secondary" onClick={undoLastDelete} style={{ fontSize: 12, padding: "3px 10px" }}>
                      {ui.undoDelete}
                    </button>
                  </div>
                )}

                {/* Sessions grid / empty state */}
                {sortedSessions.length === 0 ? (
                  <div className="empty-state-dashed">
                    <p className="muted mb-10">{ui.noSessions}</p>
                    <button className="button" onClick={() => createNewSessionForChild()} style={{ padding: "8px 18px" }}>
                      {ui.createFirstSession}
                    </button>
                  </div>
                ) : (
                  <div className="sessions-grid">
                    {sortedSessions.map((sess, idx) => {
                      const isSel = idx === selectedSessionIdx;
                      const isNew = sess.updatedAt === highlightedSessionUpdatedAt;
                      const recs = sess.records.length;
                      const answerRecords = sess.records.filter(r => inferRecordEventType(r) === "answer");
                      const aCnt = answerRecords.filter(r => r.scenario === "A").length;
                      const bCnt = answerRecords.filter(r => r.scenario === "B").length;
                      const flowSignals = getSessionSignals(sess.records);
                      const sessionStatus = getSessionStatus(sess);
                      const processBits = [
                        `A:${aCnt}`,
                        `B:${bCnt}`,
                        flowSignals.clarifications > 0 ? `${ui.clarification}:${flowSignals.clarifications}` : null,
                        flowSignals.returns > 0 ? `${ui.returnToQuestion}:${flowSignals.returns}` : null,
                        flowSignals.skips > 0 ? `${ui.skipped}:${flowSignals.skips}` : null,
                        flowSignals.retries > 0 ? `${ui.retryAnswer}:${flowSignals.retries}` : null,
                      ].filter(Boolean).join(" · ");

                      return (
                        <button
                          key={`${sess.updatedAt}-${idx}`}
                          onClick={() => {
                            setSelectedSessionIdx(idx);
                            setNewSessionHint(null);
                            setLastDeleted(null);
                          }}
                          className="session-card-btn"
                          style={{
                            border: isSel ? "2px solid var(--accent)" : "1px solid var(--line)",
                            background: isSel ? "var(--soft)" : "white",
                            boxShadow: isNew ? "0 0 0 3px #f2c94c" : undefined,
                          }}
                          title={sess.context}
                        >
                          <div className="session-card-title">
                            <span>{sess.context.length > 38 ? sess.context.slice(0, 35) + "..." : sess.context}</span>
                            <span className="session-card-date">{new Date(sess.updatedAt).toLocaleDateString(locale)}</span>
                          </div>
                          <div className="session-card-subtitle">
                            {recs} {ui.stepsShort}
                            <span className="ml-8">
                              {processBits}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* DETAILED SESSION VIEWER */}
              <div className="panel">
                {!currentSession ? (
                  <div className="muted">{ui.selectSessionAbove}</div>
                ) : (
                  <>
                    <div className="session-detail-header">
                      <div>
                        <strong className="session-context-title">{currentSession.context}</strong>
                        <span className="muted session-detail-date">
                          {new Date(currentSession.updatedAt).toLocaleString(locale)}
                        </span>
                      </div>
                      <div className="muted session-records-count">{currentSession.records.length} {ui.records}</div>
                    </div>

                    {currentSession.records.length === 0 && (
                      <div className="empty-session-placeholder">
                        {ui.emptySession}
                      </div>
                    )}

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
                          <div className="trajectory-note">
                            {ui.trajectoryNote(currentSessionSignals)}
                          </div>
                        </div>
                        {currentSession.records.map((rec, i) => {
                          const eventType = inferRecordEventType(rec);
                          const isProcessOnly = eventType === "clarify_request" || eventType === "back";

                          return (
                          <div key={`${rec.stageId}-${i}-${rec.timestamp || ''}`} className="record-item" style={{ borderLeft: `4px solid ${getScenarioColor(rec.scenario)}` }}>
                            <div className="record-meta">
                              {ui.stage} {rec.stageId} · {rec.stageTitle}
                            </div>
                            <div className="record-tags">
                              <span className="badge" style={getEventBadgeStyle(rec)}>
                                {ui.eventLabel(rec)}
                              </span>
                              {!isProcessOnly && (
                              <span className="scenario-badge" style={{
                                background: rec.scenario === "skipped" ? "var(--muted)" : getScenarioColor(rec.scenario),
                              }}>
                                {ui.scenarioLabel(rec.scenario)}
                              </span>
                              )}
                              {isRetryRecord(currentSession.records, i) && (
                                <span className="badge badge-blue">{ui.retryAnswer}</span>
                              )}
                              {rec.timestamp && (
                                <span className="muted record-timestamp">
                                  {new Date(rec.timestamp).toLocaleString(locale)}
                                </span>
                              )}
                            </div>
                            <div className="record-field"><strong>{ui.questionLabel}</strong> {rec.question}</div>
                            <div className="record-field"><strong>{ui.answerLabel}</strong> {rec.answer}</div>
                            <div className="support-label-text"><strong>{ui.supportLabel}</strong> {rec.feedback}</div>
                            {(rec.responseMode || rec.provider || rec.model) && (
                              <div className="muted record-source">
                                <strong>{ui.aiSourceLabel}</strong>{" "}
                                {[rec.provider, rec.model, ui.responseModeLabel(rec.responseMode)].filter(Boolean).join(" · ")}
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

                    {/* LLM-комментарий из истории (то, что видел подросток перед стартом этой сессии) */}
                    {currentSession.historyInsight && (
                      <div className="insight-box">
                        <div className="insight-title">
                          {ui.aiInsightTitle}
                        </div>
                        <p className="p-line" style={{ margin: 0 }}>{currentSession.historyInsight}</p>
                      </div>
                    )}

                    {/* Обратная связь подростка (новая) */}
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
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}


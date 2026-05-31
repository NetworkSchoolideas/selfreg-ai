"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LanguageToggle } from "@/app/components/LanguageToggle";
import { normalizeAppLang, withLang } from "@/lib/app-i18n";
import { ChildrenStorage, type Child, type Session, type RecordItem } from "@/lib/children-storage";

// Устаревший ключ — оставлен только для совместимости при миграции

// Простая инфографика без внешних библиотек
function getScenarioDistribution(sessions: Session[]) {
  const allRecords = sessions.flatMap(s => s.records);
  const total = allRecords.length || 1;
  const a = allRecords.filter(r => r.scenario === "A").length;
  const b = allRecords.filter(r => r.scenario === "B").length;
  const clarify = allRecords.filter(r => r.scenario === "clarify").length;
  const skipped = allRecords.filter(r => r.scenario === "skipped").length;

  // Percentages are calculated on non-skipped records for visual stability
  const nonSkipped = total - skipped;
  const base = nonSkipped || 1;

  return {
    a: Math.round((a / base) * 100),
    b: Math.round((b / base) * 100),
    clarify: Math.round((clarify / base) * 100),
    skipped,
    raw: { a, b, clarify, skipped, total }
  };
}

function getStageSupport(sessions: Session[]) {
  const allRecords = sessions.flatMap(s => s.records);
  const stages: Record<string, { A: number; B: number; clarify: number; skipped: number }> = {};

  allRecords.forEach(r => {
    if (!stages[r.stageId]) stages[r.stageId] = { A: 0, B: 0, clarify: 0, skipped: 0 };
    const key = (r.scenario === "skipped" ? "skipped" : r.scenario) as "A" | "B" | "clarify" | "skipped";
    stages[r.stageId][key]++;
  });

  return Object.entries(stages).map(([stageId, counts]) => ({
    stageId,
    ...counts
  }));
}

function createSampleSession(lang: "ru" | "en", locale: string): Session {
  return lang === "en"
    ? {
        context: "study project",
        updatedAt: new Date().toISOString(),
        lang,
        finalNote: "The adolescent benefits more from one small first step and a calm check of the result than from a generic call to try harder.",
        historyInsight: "You have already done good work in previous cycles. The latest session showed you can break big tasks into tiny steps. Keep that momentum — one concrete action today will build real confidence.",
        adolescentFeedback: {
          rating: 4,
          comment: "Было полезно понять, что нужно начинать с маленького шага, а не с идеального плана.",
          timestamp: new Date().toISOString()
        },
        records: [
          {
            stageId: "1",
            stageTitle: "Goal",
            scenario: "A",
            question: "What matters most to improve right now?",
            answer: "I want to finish the project, but I do not know where to start.",
            feedback: "The goal is visible, but it will help to narrow it down to one concrete result for the near future.",
            timestamp: new Date().toLocaleString(locale)
          },
          {
            stageId: "2",
            stageTitle: "Move to action",
            scenario: "A",
            question: "What small step can you do today?",
            answer: "I can make the structure and write the first paragraph.",
            feedback: "A workable first step has appeared. Now it is important to keep the plan simple and not overload it.",
            timestamp: new Date().toLocaleString(locale)
          }
        ]
      }
    : {
        context: "учебный проект",
        updatedAt: new Date().toISOString(),
        lang,
        finalNote: "Подростку полезнее один посильный первый шаг и спокойная проверка результата, чем общий призыв «стараться сильнее».",
        historyInsight: "Ты уже проделал хорошую работу в прошлых циклах. Последняя сессия показала, что ты умеешь разбивать большие задачи на крошечные шаги. Сохраняй этот импульс — одно конкретное действие сегодня сильно поднимет уверенность.",
        adolescentFeedback: {
          rating: 4,
          comment: "Было полезно понять, что нужно начинать с маленького шага, а не с идеального плана.",
          timestamp: new Date().toISOString()
        },
        records: [
          {
            stageId: "1",
            stageTitle: "Цель",
            scenario: "A",
            question: "Что сейчас важнее всего улучшить?",
            answer: "Хочу закончить проект, но пока не понимаю, с чего начать.",
            feedback: "Цель уже видна, но ее стоит сузить до одного ближайшего результата.",
            timestamp: new Date().toLocaleString(locale)
          },
          {
            stageId: "2",
            stageTitle: "Переход к действию",
            scenario: "A",
            question: "Какой маленький шаг можно сделать сегодня?",
            answer: "Могу сделать структуру и написать первый абзац.",
            feedback: "Появился рабочий первый шаг. Дальше важно не перегрузить план.",
            timestamp: new Date().toLocaleString(locale)
          }
        ]
      };
}

export function TeacherDashboard() {
  const searchParams = useSearchParams();
  const lang = normalizeAppLang(searchParams.get("lang"));
  const locale = lang === "en" ? "en-US" : "ru-RU";

  // Выбранная сессия внутри выбранного ребёнка (по индексу после сортировки)
  const [selectedSessionIdx, setSelectedSessionIdx] = useState(0);

  // Показывать ли подсказку после создания новой сессии
  const [newSessionHint, setNewSessionHint] = useState<{ context: string } | null>(null);

  const DASHBOARD_STATE_KEY = "selfreg_dashboard_state";

  const ui = {
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
    storageLabel: lang === "en" ? "localStorage · ready for migration" : "localStorage · готово к миграции",
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
    scenarioA: lang === "en" ? "Scenario A" : "Сценарий A",
    scenarioB: lang === "en" ? "Scenario B" : "Сценарий B",
    clarification: lang === "en" ? "Clarifications" : "Уточнения",
    skipped: lang === "en" ? "Skipped" : "Пропущено",
    totalRecords: lang === "en" ? "Total records:" : "Всего записей:",
    stageSupportTitle:
      lang === "en" ? "Support need by stage" : "Нужда в поддержке по этапам",
    stage: lang === "en" ? "Stage" : "Этап",
    records: lang === "en" ? "records" : "записей",
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
  };

  // === Используем централизованное хранилище детей ===
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [revealIdentity, setRevealIdentity] = useState(false);
  const [childSearch, setChildSearch] = useState("");
  const [newSessionContextInput, setNewSessionContextInput] = useState("");
  const [highlightedSessionUpdatedAt, setHighlightedSessionUpdatedAt] = useState<string | null>(null);
  const [copiedChildId, setCopiedChildId] = useState<string | null>(null);
  const [lastDeleted, setLastDeleted] = useState<{ childId: string; session: Session } | null>(null);

  const selectedChild = children.find(c => c.id === selectedChildId) || children[0];

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
    let loaded = ChildrenStorage.getAll();

    // Если база пустая — создаём демо (ТОЛЬКО если данных нет вообще)
    if (loaded.length === 0) {
      const child1 = ChildrenStorage.addChild("Алексей Петров");
      const child2 = ChildrenStorage.addChild("Мария Иванова");

      // Добавляем демо-сессию первому ребёнку
      ChildrenStorage.saveSessionForChild(child1.id, createSampleSession(lang, locale));

      loaded = ChildrenStorage.getAll();
    }

    // Defensive: если по какой-то причине есть дубликаты ID (legacy data), регенерируем их
    const seen = new Set<string>();
    let hadDuplicates = false;
    loaded = loaded.map(child => {
      if (seen.has(child.id)) {
        hadDuplicates = true;
        return { ...child, id: `child_${Date.now()}_${Math.random().toString(36).slice(2, 11)}` };
      }
      seen.add(child.id);
      return child;
    });
    if (hadDuplicates) {
      ChildrenStorage.saveAll(loaded);
    }

    queueMicrotask(() => {
      setChildren(loaded);

      // Восстанавливаем последнее состояние из localStorage, если оно валидно
      let restored = false;
      try {
        const saved = localStorage.getItem(DASHBOARD_STATE_KEY);
        if (saved) {
          const { childId: savedChildId, sessionIdx: savedSessionIdx } = JSON.parse(saved);

          const childExists = loaded.some(c => c.id === savedChildId);
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
  }, []); // Убрали lang и locale из зависимостей, чтобы демо не пересоздавались

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

    ChildrenStorage.saveSessionForChild(selectedChild.id, newSession);

    // Обновляем локальное состояние
    const updatedChildren = ChildrenStorage.getAll();
    setChildren(updatedChildren);

    // Переключаемся на самую свежую сессию
    setSelectedSessionIdx(0);

    // Временно подсвечиваем новую сессию
    const newUpdatedAt = newSession.updatedAt;
    setHighlightedSessionUpdatedAt(newUpdatedAt);

    // Автоматически убираем подсветку через 2.5 секунды
    setTimeout(() => {
      setHighlightedSessionUpdatedAt(null);
    }, 2500);

    // Показываем умную подсказку с контекстом сессии
    setNewSessionHint({ context: newSession.context });
    setLastDeleted(null); // скрываем undo при создании новой

    // Авто-скрытие подсказки через 12 секунд
    setTimeout(() => {
      setNewSessionHint(null);
    }, 12000);
  }

  // === UI helpers for the new coherent dashboard ===
  const getScenarioColor = (s: "A" | "B" | "clarify" | "skipped") =>
    s === "A" ? "var(--accent)" : s === "B" ? "var(--orange)" : s === "clarify" ? "var(--green)" : "var(--muted)";

  const getScenarioLabel = (s: "A" | "B" | "clarify" | "skipped") =>
    s === "clarify" ? "Уточнение" : s === "skipped" ? "Пропущено" : `Сценарий ${s}`;

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

    ChildrenStorage.deleteChild(selectedChild.id);
    const fresh = ChildrenStorage.getAll();
    setChildren(fresh);
    setLastDeleted(null);
    setNewSessionHint(null);

    // pick next or none
    if (fresh.length > 0) {
      setSelectedChildId(fresh[0].id);
      setSelectedSessionIdx(0);
    } else {
      setSelectedChildId(null);
    }
  }

  function copyAllLinks() {
    const links = children
      .map((c) => `${window.location.origin}${withLang(`/adolescent?childId=${c.id}`, lang)}`)
      .join("\n");
    navigator.clipboard.writeText(links);
    alert(`Скопировано ${children.length} ссылок`);
  }

  function copyChildLink(child: Child) {
    const link = `${window.location.origin}${withLang(`/adolescent?childId=${child.id}`, lang)}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedChildId(child.id);
      setTimeout(() => setCopiedChildId(null), 1400);
    });
  }

  function createNewSessionFromInput() {
    createNewSessionForChild(newSessionContextInput);
    setNewSessionContextInput("");
  }

  function deleteSelectedSession() {
    if (!selectedChild || !currentSession) return;
    if (!confirm("Удалить эту сессию?")) return;

    setLastDeleted({ childId: selectedChild.id, session: { ...currentSession } });
    ChildrenStorage.deleteSession(selectedChild.id, currentSession.updatedAt);

    const fresh = ChildrenStorage.getAll();
    setChildren(fresh);
    setSelectedSessionIdx(0);

    setTimeout(() => setLastDeleted(null), 12000);
  }

  function undoLastDelete() {
    if (!lastDeleted) return;
    ChildrenStorage.saveSessionForChild(lastDeleted.childId, lastDeleted.session);
    const fresh = ChildrenStorage.getAll();
    setChildren(fresh);
    setLastDeleted(null);
    setSelectedSessionIdx(0);
  }

  return (
    <main className="shell">
      {/* Top bar — unchanged, professional */}
      <div className="topbar app-header">
        <div>
          <p className="eyebrow">{ui.eyebrow}</p>
          <h1>{ui.title}</h1>
          <p className="muted">{ui.intro}</p>
          <p style={{ marginTop: 8, fontSize: 13, color: "var(--muted)" }}>
            {ui.introSubtitle}
          </p>
        </div>
        <div className="action-row">
          <LanguageToggle />
          <Link className="button secondary" href={withLang("/", lang)}>
            {ui.home}
          </Link>
          <Link className="button" href={withLang("/adolescent", lang)}>
            {ui.prototype}
          </Link>
        </div>
      </div>

      {/* === NEW COHERENT DASHBOARD: left children + main (header + infographics + sessions + detail) === */}
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        {/* LEFT SIDEBAR — Children as first-class citizens */}
        <aside style={{ width: 288, flex: "0 0 288px" }}>
          <div className="panel" style={{ position: "sticky", top: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div>
                <strong style={{ fontSize: 15 }}>{ui.students}</strong>
                <span className="muted" style={{ fontSize: 12, marginLeft: 6 }}>({children.length})</span>
              </div>
              <button className="button secondary" onClick={copyAllLinks} style={{ fontSize: 11, padding: "4px 9px" }} title={ui.copyAllLinks}>
                {ui.copyAllLinks}
              </button>
            </div>

            {/* Search */}
            <input
              type="text"
              placeholder={ui.searchPlaceholder}
              value={childSearch}
              onChange={(e) => setChildSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "7px 10px",
                borderRadius: 6,
                border: "1px solid var(--line)",
                fontSize: 13,
                marginBottom: 10
              }}
            />

            {/* Children list */}
            <div style={{ maxHeight: "calc(100vh - 340px)", overflowY: "auto", marginBottom: 12, paddingRight: 4 }}>
              {visibleChildren.length === 0 && (
                <div className="muted" style={{ fontSize: 13, padding: "12px 0" }}>Ничего не найдено</div>
              )}

              {visibleChildren.map((child) => {
                const isActive = selectedChildId === child.id;
                const sessCount = child.sessions?.length || 0;
                const last = child.updatedAt ? new Date(child.updatedAt).toLocaleDateString(locale) : "—";

                return (
                  <div
                    key={child.id}
                    onClick={() => selectChild(child.id)}
                    style={{
                      padding: "9px 10px",
                      marginBottom: 6,
                      borderRadius: 7,
                      border: isActive ? "1.5px solid var(--accent)" : "1px solid var(--line)",
                      background: isActive ? "var(--soft)" : "white",
                      cursor: "pointer",
                      transition: "all 0.1s ease"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 600, color: isActive ? "var(--accent)" : "var(--text)" }}>
                          {child.id}
                        </div>
                        <div style={{ fontSize: 12, marginTop: 1, color: "var(--muted)" }}>
                          {sessCount} {sessCount === 1 ? ui.session : ui.sessions} · {last}
                        </div>

                        {/* Real data hint (no full reveal in list for privacy) */}
                        {child.realData && (
                          <div style={{ fontSize: 11, marginTop: 3, color: "var(--green)" }}>
                            {revealIdentity ? `${child.realData.fio} · ${child.realData.klass}` : ui.hasRealData}
                          </div>
                        )}
                      </div>

                      {/* Per-child quick actions (do not bubble) */}
                      <div style={{ display: "flex", gap: 4 }} onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={withLang(`/adolescent?childId=${child.id}`, lang)}
                          className="button"
                          target="_blank"
                          style={{ fontSize: 10, padding: "1px 6px", minHeight: 24 }}
                          title={ui.openPrototype}
                        >
                          {ui.start}
                        </Link>
                        <button
                          className="button secondary"
                          onClick={() => copyChildLink(child)}
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

            {/* Add new child (manual, for teacher) */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const nameInput = form.elements.namedItem("childName") as HTMLInputElement;
                if (nameInput?.value.trim()) {
                  const newC = ChildrenStorage.addChild(nameInput.value.trim());
                  setChildren(ChildrenStorage.getAll());
                  selectChild(newC.id);
                  nameInput.value = "";
                }
              }}
              style={{ display: "flex", gap: 6, flexWrap: 'wrap' }}
            >
              <input
                name="childName"
                type="text"
                placeholder={ui.addNamePlaceholder}
                style={{ flex: '1 1 140px', minWidth: 0, padding: "6px 9px", borderRadius: 6, border: "1px solid var(--line)", fontSize: 13 }}
              />
              <button type="submit" className="button secondary" style={{ padding: "6px 10px", fontSize: 12, whiteSpace: 'nowrap' }}>
                {ui.addChild}
              </button>
            </form>
            <div className="muted" style={{ fontSize: 11, marginTop: 6, textAlign: "center" }}>
              {ui.storageLabel}
            </div>
          </div>
        </aside>

        {/* MAIN AREA */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selectedChild ? (
            <div className="panel" style={{ textAlign: "center", padding: "60px 20px" }}>
              <h3 style={{ marginTop: 0 }}>{ui.selectStudentLeft}</h3>
              <p className="muted">{ui.selectStudentLeftDesc}</p>
            </div>
          ) : (
            <>
              {/* CHILD HEADER + QUICK ACTIONS */}
              <div className="panel" style={{ marginBottom: 16, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.5px" }}>{ui.studentIdLabel}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "monospace", marginTop: 1 }}>{selectedChild.id}</div>

                    {/* Real identity reveal (privacy-first) */}
                    {selectedChild.realData && (
                      <div style={{ marginTop: 6, fontSize: 13 }}>
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
                    <div style={{ marginTop: 4, fontSize: 13, color: "var(--muted)" }}>
                      {selectedChild.sessions.length} {selectedChild.sessions.length === 1 ? ui.session : ui.sessions} · {ui.lastUpdate}{" "}
                      {selectedChild.updatedAt ? new Date(selectedChild.updatedAt).toLocaleDateString(locale) : "—"}
                    </div>
                  </div>

                  {/* Quick actions bar */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <input
                        type="text"
                        value={newSessionContextInput}
                        onChange={(e) => setNewSessionContextInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") createNewSessionFromInput(); }}
                        placeholder="Контекст новой сессии (учёба, спорт...)"
                        style={{ width: 210, fontSize: 13, padding: "7px 9px", borderRadius: 6, border: "1px solid var(--line)" }}
                      />
                      <button className="button" onClick={createNewSessionFromInput} style={{ padding: "7px 14px" }}>
                        + Новая сессия
                      </button>
                      <Link
                        href={withLang(`/adolescent?childId=${selectedChild.id}`, lang)}
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
                        className="button secondary"
                        style={{ fontSize: 12, color: "#b44", borderColor: "#e8b4b4", padding: "4px 9px" }}
                      >
                        {ui.deleteStudent}
                      </button>
                  </div>
                </div>
              </div>

              {/* AGGREGATED INFOGRAPHICS */}
              <div className="panel" style={{ marginBottom: 16 }}>
                <h3 style={{ margin: "0 0 10px 0", fontSize: 15 }}>{ui.analyticsTitle}</h3>

                <div style={{ display: "grid", gridTemplateColumns: "1.05fr 1fr", gap: 18 }}>
                  {/* Scenario distribution */}
                  <div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>{ui.scenarioDistribution}</div>
                    <div style={{ height: 22, background: "#f0f0f0", borderRadius: 999, overflow: "hidden", display: "flex" }}>
                      <div style={{ width: `${distribution.a}%`, background: "var(--accent)" }} title={`${ui.scenarioA}: ${distribution.a}%`} />
                      <div style={{ width: `${distribution.b}%`, background: "var(--orange)" }} title={`${ui.scenarioB}: ${distribution.b}%`} />
                      <div style={{ width: `${distribution.clarify}%`, background: "var(--green)" }} title={`${ui.clarification}: ${distribution.clarify}%`} />
                    </div>
                    <div style={{ display: "flex", gap: 14, marginTop: 6, fontSize: 13 }}>
                      <span><span style={{ color: "var(--accent)" }}>●</span> {ui.scenarioA}: <strong>{distribution.a}%</strong> ({distribution.raw.a})</span>
                      <span><span style={{ color: "var(--orange)" }}>●</span> {ui.scenarioB}: <strong>{distribution.b}%</strong> ({distribution.raw.b})</span>
                      <span><span style={{ color: "var(--green)" }}>●</span> {ui.clarification}: <strong>{distribution.clarify}%</strong> ({distribution.raw.clarify})</span>
                      {distribution.raw.skipped > 0 && (
                        <span style={{ color: "var(--muted)" }}>{ui.skipped}: <strong>{distribution.raw.skipped}</strong></span>
                      )}
                    </div>
                    <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{ui.totalRecords} {totalRecords}</div>
                  </div>

                  {/* Per-stage support */}
                  <div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>{ui.stageSupportTitle}</div>
                    {stageSupport.length > 0 ? (
                      stageSupport.map((s) => {
                        const sum = (s.A + s.B + s.clarify) || 1;
                        return (
                          <div key={s.stageId} style={{ marginBottom: 5 }}>
                            <div style={{ fontSize: 12, marginBottom: 1, display: "flex", justifyContent: "space-between" }}>
                              <span>{ui.stage} {s.stageId}</span>
                              <span className="muted" style={{ fontSize: 11 }}>{s.A + s.B + s.clarify} {ui.records}</span>
                            </div>
                            <div style={{ height: 11, background: "#eee", borderRadius: 999, display: "flex", overflow: "hidden" }}>
                              <div style={{ width: `${(s.A / sum) * 100}%`, background: "var(--accent)" }} />
                              <div style={{ width: `${(s.B / sum) * 100}%`, background: "var(--orange)" }} />
                              <div style={{ width: `${(s.clarify / sum) * 100}%`, background: "var(--green)" }} />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="muted" style={{ fontSize: 13 }}>{ui.noStageData}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* SESSIONS LIST */}
              <div className="panel" style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div>
                    <strong style={{ fontSize: 15 }}>{ui.sessionsLabel}</strong>
                    <span className="muted" style={{ marginLeft: 8, fontSize: 13 }}>({sortedSessions.length})</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
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
                  <div style={{ background: "var(--soft)", borderRadius: 6, padding: "8px 12px", marginBottom: 10, fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>{ui.newSessionHint.replace("{context}", newSessionHint.context)}</span>
                    <Link href={withLang(`/adolescent?childId=${selectedChild.id}`, lang)} className="button" target="_blank" style={{ fontSize: 12, padding: "3px 9px" }} onClick={() => setNewSessionHint(null)}>
                      {ui.openPrototype}
                    </Link>
                  </div>
                )}

                {/* Undo bar */}
                {lastDeleted && (
                  <div style={{ background: "#fff8e1", border: "1px solid #ffeaa7", borderRadius: 6, padding: "8px 12px", marginBottom: 10, fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>{ui.sessionDeleted}</span>
                    <button className="button secondary" onClick={undoLastDelete} style={{ fontSize: 12, padding: "3px 10px" }}>
                      {ui.undoDelete}
                    </button>
                  </div>
                )}

                {/* Sessions grid / empty state */}
                {sortedSessions.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "28px 12px", border: "1px dashed var(--line)", borderRadius: 8 }}>
                    <p className="muted" style={{ marginBottom: 10 }}>{ui.noSessions}</p>
                    <button className="button" onClick={() => createNewSessionForChild()} style={{ padding: "8px 18px" }}>
                      {ui.createFirstSession}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {sortedSessions.map((sess, idx) => {
                      const isSel = idx === selectedSessionIdx;
                      const isNew = sess.updatedAt === highlightedSessionUpdatedAt;
                      const recs = sess.records.length;
                      const aCnt = sess.records.filter(r => r.scenario === "A").length;
                      const bCnt = sess.records.filter(r => r.scenario === "B").length;
                      const cCnt = sess.records.filter(r => r.scenario === "clarify").length;

                      return (
                        <button
                          key={`${sess.updatedAt}-${idx}`}
                          onClick={() => {
                            setSelectedSessionIdx(idx);
                            setNewSessionHint(null);
                            setLastDeleted(null);
                          }}
                          style={{
                            flex: "1 1 240px",
                            minWidth: 220,
                            textAlign: "left",
                            padding: "9px 11px",
                            borderRadius: 7,
                            border: isSel ? "2px solid var(--accent)" : "1px solid var(--line)",
                            background: isSel ? "var(--soft)" : "white",
                            boxShadow: isNew ? "0 0 0 3px #f2c94c" : undefined,
                            cursor: "pointer"
                          }}
                          title={sess.context}
                        >
                          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2, display: "flex", justifyContent: "space-between" }}>
                            <span>{sess.context.length > 38 ? sess.context.slice(0, 35) + "..." : sess.context}</span>
                            <span style={{ fontSize: 11, color: "var(--muted)" }}>{new Date(sess.updatedAt).toLocaleDateString(locale)}</span>
                          </div>
                          <div style={{ fontSize: 12, color: "var(--muted)" }}>
                            {recs} шагов
                            <span style={{ marginLeft: 8 }}>
                              A:{aCnt} · B:{bCnt} · У:{cCnt}
                              {sess.records.some(r => r.scenario === "skipped") && " · Проп: " + sess.records.filter(r => r.scenario === "skipped").length}
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
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                      <div>
                        <strong style={{ fontSize: 15 }}>{currentSession.context}</strong>
                        <span className="muted" style={{ marginLeft: 10, fontSize: 12 }}>
                          {new Date(currentSession.updatedAt).toLocaleString(locale)}
                        </span>
                      </div>
                      <div className="muted" style={{ fontSize: 12 }}>{currentSession.records.length} {ui.records}</div>
                    </div>

                    {currentSession.records.length === 0 && (
                      <div style={{ padding: "16px 0", color: "var(--muted)", fontSize: 14 }}>
                        {ui.emptySession}
                      </div>
                    )}

                    {currentSession.records.length > 0 && (
                      <div style={{ display: "grid", gap: 10 }}>
                        {currentSession.records.map((rec, i) => (
                          <div key={`${rec.stageId}-${i}-${rec.timestamp || ''}`} style={{ borderLeft: `4px solid ${getScenarioColor(rec.scenario)}`, paddingLeft: 12, paddingTop: 2, paddingBottom: 2 }}>
                            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 1 }}>
                              {ui.stage} {rec.stageId} · {rec.stageTitle}
                            </div>
                            <div style={{ marginBottom: 3 }}>
                              <span style={{
                                display: "inline-block",
                                background: rec.scenario === "skipped" ? "var(--muted)" : getScenarioColor(rec.scenario),
                                color: "white",
                                fontSize: 11,
                                padding: "1px 7px",
                                borderRadius: 999,
                                fontWeight: 600
                              }}>
                                {ui.scenarioLabel(rec.scenario)}
                              </span>
                            </div>
                            <div style={{ fontSize: 13, marginBottom: 2 }}><strong>Вопрос:</strong> {rec.question}</div>
                            <div style={{ fontSize: 13, marginBottom: 2 }}><strong>Ответ подростка:</strong> {rec.answer}</div>
                            <div style={{ fontSize: 13, color: "#334455" }}><strong>Поддержка:</strong> {rec.feedback}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {currentSession.finalNote && (
                      <div style={{ marginTop: 14, padding: 12, background: "var(--soft)", borderRadius: 6, fontSize: 13 }}>
                        <strong>{ui.finalInterpretation}</strong>
                        <p style={{ marginTop: 6, lineHeight: 1.45 }}>{currentSession.finalNote}</p>
                      </div>
                    )}

                    {/* LLM-комментарий из истории (то, что видел подросток перед стартом этой сессии) */}
                    {currentSession.historyInsight && (
                      <div style={{ marginTop: 14, padding: 12, background: '#f0f7ff', border: '1px solid var(--accent)', borderRadius: 6, fontSize: 13 }}>
                        <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--accent)' }}>
                          {ui.aiInsightTitle}
                        </div>
                        <p style={{ margin: 0, lineHeight: 1.45 }}>{currentSession.historyInsight}</p>
                      </div>
                    )}

                    {/* Обратная связь подростка (новая) */}
                    {currentSession.adolescentFeedback && (
                      <div style={{ marginTop: 14, padding: 12, background: '#f8f1e3', border: '1px solid #e8b86d', borderRadius: 6, fontSize: 13 }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>
                          {ui.adolescentFeedback}
                          {currentSession.adolescentFeedback.rating && (
                            <span style={{ marginLeft: 8, fontSize: 12 }}>{ui.usefulness(currentSession.adolescentFeedback.rating)}</span>
                          )}
                        </div>
                        {currentSession.adolescentFeedback.comment && (
                          <p style={{ margin: 0, lineHeight: 1.45 }}>{currentSession.adolescentFeedback.comment}</p>
                        )}
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
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

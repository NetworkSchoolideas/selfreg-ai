"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LanguageToggle } from "@/app/components/LanguageToggle";
import { normalizeAppLang, withLang } from "@/lib/app-i18n";
import { createChildId, type Child, type Session, type RecordItem } from "@/lib/children-storage";
import { DataService } from "@/lib/data-service";
import { inferRecordEventType } from "@/lib/session-helpers";
import { isRetryRecord, reduceFlowState } from "@/lib/selfreg-flow-machine";
import ClassStats from "@/components/analytics/ClassStats";
import ProgressChart from "@/components/analytics/ProgressChart";
import type { TeacherAnalytics } from "@/lib/server-storage";

// Устаревший ключ — оставлен только для совместимости при миграции

// Простая инфографика без внешних библиотек
function getScenarioDistribution(sessions: Session[]) {
  const allRecords = sessions.flatMap(s => s.records);
  const supportRecords = allRecords.filter(r => {
    const eventType = inferRecordEventType(r);
    return eventType === "answer" || eventType === "skip";
  });
  const total = supportRecords.length || 1;
  const a = supportRecords.filter(r => r.scenario === "A").length;
  const b = supportRecords.filter(r => r.scenario === "B").length;
  const clarify = allRecords.filter(r => inferRecordEventType(r) === "clarify_request").length;
  const skipped = supportRecords.filter(r => r.scenario === "skipped").length;

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
    const eventType = inferRecordEventType(r);
    if (!stages[r.stageId]) stages[r.stageId] = { A: 0, B: 0, clarify: 0, skipped: 0 };
    if (eventType === "clarify_request") {
      stages[r.stageId].clarify++;
    } else if (eventType === "answer" || eventType === "skip") {
      const key = (r.scenario === "skipped" ? "skipped" : r.scenario) as "A" | "B" | "clarify" | "skipped";
      stages[r.stageId][key]++;
    }
  });

  return Object.entries(stages).map(([stageId, counts]) => ({
    stageId,
    ...counts
  }));
}

function getSessionSignals(records: RecordItem[]) {
  const flow = reduceFlowState(records);

  return {
    clarifications: flow.clarifyCount,
    returns: flow.backCount,
    retries: flow.retryCount,
    skips: flow.skipCount,
    progress: flow.progressCount,
    completedStages: flow.completedStageIds.size,
    isComplete: flow.isComplete,
  };
}

function getSessionStatus(session: Session): "in_progress" | "completed" {
  if (session.status) return session.status;
  return session.finalNote?.trim() ? "completed" : "in_progress";
}

function getRecordEventLabel(record: RecordItem, lang: "ru" | "en") {
  const eventType = inferRecordEventType(record);

  if (eventType === "clarify_request") {
    return lang === "en" ? "Question was unclear" : "Вопрос был непонятен";
  }
  if (eventType === "back") {
    return lang === "en" ? "Returned to revise" : "Возврат к вопросу";
  }
  if (eventType === "skip") {
    return lang === "en" ? "Step skipped" : "Шаг пропущен";
  }
  return lang === "en" ? "Answer accepted" : "Ответ принят";
}

function getResponseModeLabel(mode: RecordItem["responseMode"], lang: "ru" | "en") {
  if (mode === "llm-json") {
    return lang === "en" ? "external AI, structured" : "внешний ИИ, структурированный ответ";
  }
  if (mode === "llm-text") {
    return lang === "en" ? "external AI, normalized text" : "внешний ИИ, текст нормализован";
  }
  if (mode === "llm-fallback") {
    return lang === "en" ? "external AI with local fallback" : "внешний ИИ + локальная страховка";
  }
  if (mode === "mock") {
    return lang === "en" ? "local safe mode" : "локальный безопасный режим";
  }
  return lang === "en" ? "source not recorded" : "источник не зафиксирован";
}

function getTrajectoryNote(
  signals: ReturnType<typeof getSessionSignals>,
  lang: "ru" | "en"
) {
  if (signals.clarifications === 0 && signals.returns === 0 && signals.retries === 0) {
    return lang === "en"
      ? "The session moved through the stages without recorded repairs."
      : "Сессия прошла без зафиксированных уточнений и возвратов.";
  }

  const parts: string[] = [];
  if (signals.clarifications > 0) {
    parts.push(
      lang === "en"
        ? "the wording needed clarification"
        : "формулировку пришлось уточнять"
    );
  }
  if (signals.returns > 0) {
    parts.push(
      lang === "en"
        ? "the adolescent returned to revise an answer"
        : "подросток возвращался к вопросу"
    );
  }
  if (signals.retries > 0) {
    parts.push(
      lang === "en"
        ? "a revised attempt appeared after support"
        : "после поддержки появилась повторная попытка"
    );
  }

  return lang === "en"
    ? `Trajectory: ${parts.join("; ")}. This is useful process data, not a failure marker.`
    : `Траектория: ${parts.join("; ")}. Это данные о процессе, а не признак неуспеха.`;
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
  const teacherIdFromUrl = searchParams.get("teacher") || undefined;
  const locale = lang === "en" ? "en-US" : "ru-RU";
  const serverBackedDashboard = Boolean(teacherIdFromUrl);

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
  const [analytics, setAnalytics] = useState<TeacherAnalytics | null>(null);

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

    void (async () => {
      await DataService.deleteSession(selectedChild.id, currentSession.updatedAt);

      const fresh = await DataService.getChildren();
      setChildren(fresh);
      setSelectedSessionIdx(0);
    })();

    setTimeout(() => setLastDeleted(null), 12000);
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
        {/* LEFT SIDEBAR — Children as first-class citizens */}
        <aside className="dashboard-sidebar">
          <div className="panel sidebar-sticky">
            <div className="flex-row items-center justify-between mb-10">
              <div>
                <strong className="fs-15">{ui.students}</strong>
                <span className="muted fs-12 ml-6">({children.length})</span>
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
              className="w-full fs-13 mb-10 sidebar-search"
            />

            {/* Children list */}
            <div className="children-list-scroll">
              {visibleChildren.length === 0 && (
                <div className="muted fs-13" style={{ padding: "12px 0" }}>Ничего не найдено</div>
              )}

              {visibleChildren.map((child) => {
                const isActive = selectedChildId === child.id;
                const sessCount = child.sessions?.length || 0;
                const last = child.updatedAt ? new Date(child.updatedAt).toLocaleDateString(locale) : "—";

                return (
                  <div
                    key={child.id}
                    onClick={() => selectChild(child.id)}
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
                          {sessCount} {sessCount === 1 ? ui.session : ui.sessions} · {last}
                        </div>

                        {/* Real data hint (no full reveal in list for privacy) */}
                        {child.realData && (
                          <div className="child-item-realdata">
                            {revealIdentity ? `${child.realData.fio} · ${child.realData.klass}` : ui.hasRealData}
                          </div>
                        )}
                      </div>

                      {/* Per-child quick actions (do not bubble) */}
                      <div className="child-item-actions" onClick={(e) => e.stopPropagation()}>
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
                  const name = nameInput.value.trim();

                  void (async () => {
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
                            nameInput.value = "";
                            return;
                          }
                        }
                      } catch {}
                    }

                    // Fallback: create via DataService (localStorage)
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
                    nameInput.value = "";
                  })();
                }
              }}
              className="flex-row gap-6 flex-wrap"
            >
              <input
                name="childName"
                type="text"
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


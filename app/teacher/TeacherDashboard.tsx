"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ConfirmDialog } from "@/app/components/ConfirmDialog";
import { LanguageToggle } from "@/app/components/LanguageToggle";
import { OnboardingModal } from "@/app/components/OnboardingModal";
import { ToastNotice } from "@/app/components/ToastNotice";
import { normalizeAppLang, withLang } from "@/lib/app-i18n";
import { copyTextToClipboard } from "@/lib/clipboard";
import type { RecordItem } from "@/lib/children-storage";
import ClassStats from "@/components/analytics/ClassStats";
import ProgressChart from "@/components/analytics/ProgressChart";
import { TeacherSidebar } from "@/app/teacher/TeacherSidebar";
import { TeacherSessionsPanel } from "@/app/teacher/TeacherSessionsPanel";
import { TeacherSessionDetail } from "@/app/teacher/TeacherSessionDetail";
import { TeacherChildHeader } from "@/app/teacher/TeacherChildHeader";
import { useTeacherData } from "@/app/teacher/useTeacherData";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import {
  getRecordEventLabel,
  getResponseModeLabel,
  getSessionSignals,
  getTrajectoryNote,
} from "@/lib/teacher-dashboard-analytics";

export function TeacherDashboard() {
  const searchParams = useSearchParams();
  const lang = normalizeAppLang(searchParams.get("lang"));
  const teacherIdFromQuery = searchParams.get("teacher") || undefined;
  const childIdFromUrl = searchParams.get("childId") || undefined;
  const locale = lang === "en" ? "en-US" : "ru-RU";
  const { user: authUser, isLoading: isAuthLoading, isTeacher } = useSupabaseAuth();
  const teacherIdFromUrl = teacherIdFromQuery || (isTeacher ? authUser?.id : undefined);
  const serverBackedDashboard = Boolean(teacherIdFromUrl);
  const deferInitialLoad = !teacherIdFromQuery && isAuthLoading;

  const ui = useMemo(
    () => ({
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
      prototype: lang === "en" ? "Open session app" : "Открыть сессию",
      teacherCode: lang === "en" ? "Teacher code" : "Код педагога",
      copyTeacherCode: lang === "en" ? "Copy" : "Копировать",
      teacherCodeCopied: lang === "en" ? "Copied" : "Скопировано",
      students: lang === "en" ? "Students" : "Ученики",
      searchPlaceholder:
        lang === "en" ? "Search by ID, name or class..." : "Поиск по ID, ФИО или классу...",
      sessions: lang === "en" ? "sessions" : "сессий",
      session: lang === "en" ? "session" : "сессия",
      lastUpdate: lang === "en" ? "last update" : "последнее обновление",
      hasRealData: lang === "en" ? "has real data" : "есть реальные данные",
      start: lang === "en" ? "Start" : "Старт",
      copyLink: lang === "en" ? "Copy link" : "Скопировать ссылку",
      copied: lang === "en" ? "✓" : "✓",
      copyAllLinks: lang === "en" ? "📋 Copy all links" : "📋 Все ссылки",
      addNamePlaceholder: lang === "en" ? "Name / alias" : "Имя / псевдоним",
      addChild: lang === "en" ? "+ Add" : "+ Добавить",
      noResults: lang === "en" ? "Nothing found" : "Ничего не найдено",
      storageLabel: serverBackedDashboard
        ? lang === "en"
          ? "Supabase · server sync active"
          : "Supabase · серверная синхронизация активна"
        : lang === "en"
          ? "localStorage · ready for migration"
          : "localStorage · готово к миграции",
      selectStudentLeft: lang === "en" ? "Select a student from the left" : "Выберите ученика слева",
      selectStudentLeftDesc:
        lang === "en"
          ? "Or add a new one to start working with the database."
          : "Или добавьте нового, чтобы начать работу с базой.",
      studentIdLabel: lang === "en" ? "STUDENT ID" : "ID УЧЕНИКА",
      revealIdentity: lang === "en" ? "Reveal name and class" : "Раскрыть ФИО и класс",
      hide: lang === "en" ? "Hide" : "Скрыть",
      newSession: lang === "en" ? "+ New session" : "+ Новая сессия",
      quickCreatePlaceholder:
        lang === "en"
          ? "Context for a new session (study, sport...)"
          : "Контекст новой сессии (учёба, спорт...)",
      quickCreateButton: lang === "en" ? "+ New session" : "+ Новая сессия",
      openPrototype: lang === "en" ? "Open session" : "Открыть сессию",
      copyLinkBtn: lang === "en" ? "📋 Link" : "📋 Ссылка",
      deleteStudent: lang === "en" ? "Delete student" : "Удалить ученика",
      analyticsTitle:
        lang === "en"
          ? "Aggregated analytics (all student sessions)"
          : "Агрегированная аналитика (все сессии ученика)",
      scenarioDistribution: lang === "en" ? "Support type distribution" : "Распределение типов поддержки",
      processEvents: lang === "en" ? "Process events" : "События процесса",
      scenarioA: lang === "en" ? "Scenario A" : "Сценарий A",
      scenarioB: lang === "en" ? "Scenario B" : "Сценарий B",
      clarification: lang === "en" ? "Clarifications" : "Уточнения",
      clarificationQuestion: lang === "en" ? "Question was unclear" : "Вопрос был непонятен",
      returnToQuestion: lang === "en" ? "Returned to previous question" : "Вернулся к предыдущему вопросу",
      retryAnswer: lang === "en" ? "Repeated attempt after clarification" : "Повторная попытка после уточнения",
      skipped: lang === "en" ? "Skipped" : "Пропущено",
      totalRecords: lang === "en" ? "Total records:" : "Всего записей:",
      stageSupportTitle: lang === "en" ? "Support need by stage" : "Нужда в поддержке по этапам",
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
      signalCount: (label: string, count: number) => `${label}: ${count}`,
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
      createFirstSession: lang === "en" ? "Create first session" : "Создать первую сессию",
      selectSessionAbove:
        lang === "en" ? "Select a session above to see details." : "Выберите сессию выше, чтобы увидеть детали.",
      emptySession:
        lang === "en"
          ? "Session is empty. Open the session link above and complete the cycle. Results will appear here automatically."
          : "Сессия пока пустая. Откройте ссылку на сессию выше и пройдите цикл — результаты появятся здесь автоматически.",
      scenarioLabel: (scenario: string) =>
        scenario === "clarify"
          ? lang === "en"
            ? "Clarification"
            : "Уточнение"
          : scenario === "skipped"
            ? lang === "en"
              ? "Skipped"
              : "Пропущено"
            : lang === "en"
              ? `Scenario ${scenario}`
              : `Сценарий ${scenario}`,
      finalInterpretation: lang === "en" ? "Final session interpretation" : "Итоговая интерпретация сессии",
      aiInsightTitle:
        lang === "en"
          ? "AI insight based on previous sessions (seen by adolescent)"
          : "Комментарий ИИ на основе предыдущих сессий (видел подросток)",
      adolescentFeedback: lang === "en" ? "Adolescent feedback" : "Обратная связь подростка",
      usefulness: (rating: number) =>
        lang === "en" ? `(usefulness: ${rating}/5)` : `(полезность: ${rating}/5)`,
    }),
    [lang, serverBackedDashboard]
  );

  const {
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
    isInitialLoadComplete,
    notice,
    confirmDialog,
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
    dismissNotice,
    closeConfirmDialog,
  } = useTeacherData({
    lang,
    locale,
    teacherIdFromUrl,
    childIdFromUrl,
    serverBackedDashboard,
    deferInitialLoad,
  });

  const [isTeacherCodeCopied, setIsTeacherCodeCopied] = useState(false);
  const teacherCodeCopyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const teacherCode =
    typeof authUser?.metadata?.teacher_code === "string" && authUser.metadata.teacher_code.trim()
      ? authUser.metadata.teacher_code.trim()
      : null;

  useEffect(() => {
    return () => {
      if (teacherCodeCopyTimeoutRef.current) {
        clearTimeout(teacherCodeCopyTimeoutRef.current);
      }
    };
  }, []);

  const handleCopyTeacherCode = async () => {
    if (!teacherCode) {
      return;
    }

    try {
      await copyTextToClipboard(teacherCode);
      setIsTeacherCodeCopied(true);
      if (teacherCodeCopyTimeoutRef.current) {
        clearTimeout(teacherCodeCopyTimeoutRef.current);
      }
      teacherCodeCopyTimeoutRef.current = setTimeout(() => setIsTeacherCodeCopied(false), 1600);
    } catch (copyError) {
      console.error(copyError);
    }
  };

  return (
    <main className="shell">
      <OnboardingModal isOpen={showOnboarding} onClose={closeOnboarding} lang={lang} type="teacher" />
      <ConfirmDialog
        isOpen={Boolean(confirmDialog)}
        title={confirmDialog?.title || ""}
        message={confirmDialog?.message || ""}
        confirmLabel={confirmDialog?.confirmLabel || ""}
        cancelLabel={confirmDialog?.cancelLabel || ""}
        tone="danger"
        onConfirm={() => confirmDialog?.onConfirm()}
        onCancel={closeConfirmDialog}
      />

      <div className="topbar app-header">
        <div>
          <p className="eyebrow">{ui.eyebrow}</p>
          <h1>{ui.title}</h1>
          <p className="muted">{ui.intro}</p>
          <p className="mt-8 fs-13 c-muted">{ui.introSubtitle}</p>
        </div>
        <div className="action-row">
          {teacherCode && (
            <div
              className="profile-field"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 10px",
                background: "#f8fafc",
                border: "1px solid #dbe4ef",
              }}
            >
              <span className="fs-12 c-muted">{ui.teacherCode}</span>
              <strong className="fs-14">{teacherCode}</strong>
              <button
                type="button"
                className="button secondary"
                onClick={handleCopyTeacherCode}
                style={{ fontSize: 12, padding: "4px 8px" }}
              >
                {isTeacherCodeCopied ? ui.teacherCodeCopied : ui.copyTeacherCode}
              </button>
            </div>
          )}
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

      <ToastNotice
        isVisible={Boolean(notice)}
        message={notice?.message || ""}
        tone={notice?.tone}
        onDismiss={dismissNotice}
      />

      <div className="dashboard-layout">
        <TeacherSidebar
          isReady={isInitialLoadComplete}
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

        <div className="dashboard-main">
          {!isInitialLoadComplete ? (
            <div className="panel text-center no-selection-panel">
              <p className="muted mb-0">{lang === "en" ? "Loading..." : "Загрузка..."}</p>
            </div>
          ) : !selectedChild ? (
            <div className="panel text-center no-selection-panel">
              <h3 className="mt-0">{ui.selectStudentLeft}</h3>
              <p className="muted">{ui.selectStudentLeftDesc}</p>
            </div>
          ) : (
            <>
              <TeacherChildHeader
                selectedChild={selectedChild}
                locale={locale}
                revealIdentity={revealIdentity}
                newSessionContextInput={newSessionContextInput}
                ui={ui}
                prototypeHref={buildPrototypeHref(selectedChild)}
                onToggleIdentity={setRevealIdentity}
                onSessionContextChange={setNewSessionContextInput}
                onCreateNewSession={createNewSessionFromInput}
                onCopyLink={() => copyChildLink(selectedChild)}
                onDeleteChild={deleteCurrentChild}
              />

              <div className="panel mb-16">
                <h3 className="fs-15 analytics-section-title">{ui.analyticsTitle}</h3>

                <div className="analytics-inner-grid">
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

                  <div>
                    <div className="fs-12 c-muted mb-6">{ui.stageSupportTitle}</div>
                    {stageSupport.length > 0 ? (
                      stageSupport.map((stage) => {
                        const sum = stage.A + stage.B + stage.clarify || 1;
                        return (
                          <div key={stage.stageId} className="mb-5">
                            <div className="fs-12 mb-1 flex-row justify-between">
                              <span>{ui.stage} {stage.stageId}</span>
                              <span className="muted fs-11">{stage.A + stage.B + stage.clarify} {ui.records}</span>
                            </div>
                            <div className="stage-bar-track">
                              <div style={{ width: `${(stage.A / sum) * 100}%`, background: "var(--accent)" }} />
                              <div style={{ width: `${(stage.B / sum) * 100}%`, background: "var(--orange)" }} />
                            </div>
                            {stage.clarify > 0 && (
                              <div className="muted" style={{ fontSize: 11, marginTop: 1 }}>
                                {ui.clarification}: {stage.clarify}
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
                            <div className="stat-label">{lang === "en" ? "Students" : "Учеников"}</div>
                          </div>
                          <div className="stat-item" style={{ background: "#f0fdf4" }}>
                            <div className="stat-value" style={{ color: "#10b981" }}>{analytics.totalSessions}</div>
                            <div className="stat-label">{lang === "en" ? "Sessions" : "Сессий"}</div>
                          </div>
                          <div className="stat-item" style={{ background: "#fffbeb" }}>
                            <div className="stat-value" style={{ color: "#f59e0b" }}>{analytics.totalCompletedSessions}</div>
                            <div className="stat-label">{lang === "en" ? "Completed" : "Завершено"}</div>
                          </div>
                          <div className="stat-item" style={{ background: "#f5f3ff" }}>
                            <div className="stat-value" style={{ color: "#8b5cf6" }}>
                              {analytics.totalSessions > 0
                                ? Math.round((analytics.totalCompletedSessions / analytics.totalSessions) * 100)
                                : 0}%
                            </div>
                            <div className="stat-label">{lang === "en" ? "Completion rate" : "Завершение"}</div>
                          </div>
                        </div>
                      </div>
                      <ProgressChart
                        data={analytics.studentProgress.map((item) => ({
                          totalSessions: item.totalSessions,
                          completedSessions: item.completedSessions,
                          lastActivity: item.lastActivity ?? undefined,
                        }))}
                        title={lang === "en" ? "Student Progress" : "Прогресс учеников"}
                      />
                    </div>
                  </div>
                </div>
              )}

              <TeacherSessionsPanel
                ui={ui}
                locale={locale}
                sortedSessions={sortedSessions}
                selectedSessionIdx={selectedSessionIdx}
                highlightedSessionUpdatedAt={highlightedSessionUpdatedAt}
                currentSession={currentSession}
                newSessionHint={newSessionHint}
                hasDeletedSession={Boolean(lastDeleted)}
                prototypeHref={buildPrototypeHref(selectedChild)}
                onCreateNewSession={createNewSessionFromInput}
                onCreateFirstSession={() => createNewSessionForChild()}
                onDeleteSelected={deleteSelectedSession}
                onUndoDelete={undoLastDelete}
                onDismissHint={() => setNewSessionHint(null)}
                onSelectSession={selectSession}
              />

              <TeacherSessionDetail currentSession={currentSession} locale={locale} ui={ui} />
            </>
          )}
        </div>
      </div>
    </main>
  );
}

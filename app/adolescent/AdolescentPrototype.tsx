"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { LanguageToggle } from "@/app/components/LanguageToggle";
import { AuthButton } from "@/app/components/AuthButton";
import { ApiKeyManager, type KeyStatus } from "@/app/components/ApiKeyManager";
import { ClarificationBox } from "@/app/components/ClarificationBox";
import { AdolescentFeedbackForm } from "@/app/components/AdolescentFeedbackForm";
import { OnboardingModal } from "@/app/components/OnboardingModal";
import { useAdolescentSession } from "./useAdolescentSession";
import { withLang, type AppLang } from "@/lib/app-i18n";
import {
  DEFAULT_LIVE_MODEL,
  DEFAULT_LIVE_PROVIDER,
  getProviderMeta,
  getReleaseProviders,
  isProviderEnabledInRelease,
  type ProviderId,
} from "@/lib/provider-registry";
import { ChildrenStorage } from "@/lib/children-storage";
import type { RecordItem, CompletedSession } from "@/types/session";
import { useSessionSubmit } from "@/hooks/useSessionSubmit";
import { useSessionHistory } from "@/hooks/useSessionHistory";
import { buildSessionSummary } from "@/lib/session-summary";
import { resolveTeacherLinkContext } from "@/lib/teacher-link";
import { supabase } from "@/lib/supabase-auth";

/**
 * Главный компонент прототипа для подростка.
 *
 * После рефакторинга (~250 строк):
 * - Логика submit вынесена в useSessionSubmit
 * - История вынесена в useSessionHistory
 * - Состояние сессии в useAdolescentSession
 * - UI текст локализован через useUiText
 */
export function AdolescentPrototype() {
  const searchParams = useSearchParams();
  const lang = (searchParams.get("lang") === "en" ? "en" : "ru") as AppLang;
  const childIdFromUrl = searchParams.get("childId");
  const sessionMode = searchParams.get("mode");
  const resumeSessionId = searchParams.get("resumeSessionId");
  const explicitTeacherIdFromUrl = searchParams.get("teacherId");
  const explicitTeacherCodeFromUrl = searchParams.get("teacherCode");
  const legacyTeacherLink = resolveTeacherLinkContext(searchParams.get("teacher"));
  const teacherIdFromUrl = explicitTeacherIdFromUrl || legacyTeacherLink.teacherIdFromUrl;
  const initialTeacherCode = explicitTeacherCodeFromUrl || legacyTeacherLink.teacherCodeFromUrl || "";
  const ui = useUiText(lang);
  const initialContext = lang === "en" ? "study project" : "учебный проект";

  // Core session state via hook
  const session = useAdolescentSession({ initialContext, lang });
  const {
    sessionId, context, setContext, stageId, stage, records, finalNote,
    lastClarificationFeedback, setLastClarificationFeedback,
    answer, updateAnswer,
    currentQuestion, isCompleted, completedStages, stageCount,
    addProcessRecord, addRecordAndAdvance, skipClarification, resetSession,
    suppressClarifyForNextStage, setSuppressClarifyForNextStage,
    canGoBack, addClarificationRequest, goBackOneStep, restoreSession
  } = session;

  // Provider and model state
  const [provider, setProvider] = useState<ProviderId>(DEFAULT_LIVE_PROVIDER);
  const [model, setModel] = useState(DEFAULT_LIVE_MODEL);
  const [userApiKey, setUserApiKey] = useState("");

  // Key verification status from ApiKeyManager
  const [keyStatus, setKeyStatus] = useState<KeyStatus>({ isValid: null, isTesting: false, hasSavedKey: false });
  const handleKeyStatusChange = useCallback((status: KeyStatus) => {
    setKeyStatus(status);
  }, []);

  // Registration state
  const [currentChildName, setCurrentChildName] = useState<string | null>(null);
  const [currentChildId, setCurrentChildId] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLinkedToTeacher, setIsLinkedToTeacher] = useState(false);
  const [teacherCode, setTeacherCode] = useState(initialTeacherCode);

  // UI-only state
  const [showHistory, setShowHistory] = useState(() => sessionMode !== "new" && !resumeSessionId);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [justClearedClarify, setJustClearedClarify] = useState(false);
  const [accessState, setAccessState] = useState<"checking" | "ready" | "signed-out" | "wrong-role" | "consent" | "error">("checking");
  const [isAcceptingConsent, setIsAcceptingConsent] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const clarifyResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasActiveChild = isRegistered || Boolean(currentChildId);

  const linkChildToTeacherByCode = useCallback(async (childId: string, rawTeacherCode: string) => {
    const normalizedTeacherCode = rawTeacherCode.trim();
    if (!normalizedTeacherCode) {
      return false;
    }

    try {
      const joinResponse = await fetch("/api/join-teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherCode: normalizedTeacherCode, childId }),
      });

      if (!joinResponse.ok) {
        return false;
      }

      const payload = await joinResponse.json().catch(() => null);
      return Boolean(payload?.ok);
    } catch (err) {
      console.error("[Join Teacher] Error:", err);
      return false;
    }
  }, []);

  // Onboarding check on first visit
  useEffect(() => {
    queueMicrotask(() => {
      const seen = localStorage.getItem("selfreg_onboarding_seen_adolescent");
      if (!seen) setShowOnboarding(true);
    });
  }, []);

  // The release flow always derives the student profile from the signed-in account.
  // A childId in the URL may identify a session to resume, but never authorizes a guest profile.
  useEffect(() => {
    let active = true;

    const loadChild = async () => {
      try {
        const { data: { session: authSession } } = await supabase?.auth.getSession() ?? { data: { session: null } };
        if (!authSession) {
          if (active) setAccessState("signed-out");
          return;
        }

        const response = await fetch("/api/children?childId=current", {
          cache: "no-store",
        });
        if (response.status === 401) {
          if (active) setAccessState("signed-out");
          return;
        }
        if (response.status === 403) {
          if (active) setAccessState("wrong-role");
          return;
        }
        if (!response.ok) throw new Error("Current student profile is unavailable");

        const payload = await response.json();
        if (!active || !payload?.child) throw new Error("No child in response");

        // Session writes use the local profile as the authenticated cache key.
        // Keep it aligned with the protected server response before any exercise
        // can begin; otherwise a newly consented student can finish a session
        // that has nowhere to persist locally or remotely.
        ChildrenStorage.upsertLocalChild(payload.child);

        const resumeSession = resumeSessionId
          ? payload.child.sessions?.find((item: import("@/types/session").Session) => item.sessionId === resumeSessionId)
          : null;
        if (resumeSession) {
          restoreSession(resumeSession);
          setShowHistory(false);
        } else if (sessionMode === "new") {
          resetSession();
          setShowHistory(false);
        }

        setCurrentChildName(payload.child.name);
        setCurrentChildId(payload.child.id);
        setIsRegistered(true);
        setIsLinkedToTeacher(Boolean(payload.child.teacherId));
        const linkedByCode = await linkChildToTeacherByCode(payload.child.id, teacherCode);
        if (active && linkedByCode) setIsLinkedToTeacher(true);
        if (active) setAccessState(payload.child.consentGiven ? "ready" : "consent");
      } catch {
        if (active) setAccessState("error");
      }
    };

    void loadChild();

    return () => {
      active = false;
    };
  }, [childIdFromUrl, teacherCode, linkChildToTeacherByCode, resetSession, restoreSession, resumeSessionId, sessionMode]);

  // History is read-only in the release contour. AI summary over past sessions is deferred.
  const { pastSessions } = useSessionHistory({
    childId: currentChildId,
    lang,
    provider,
    model,
    userApiKey,
  });

  // Submit hook
  const [providerStatus, setProviderStatus] = useState(`${DEFAULT_LIVE_PROVIDER}: ready`);
  const {
    isSending,
    answerQualityWarning,
    safetyNotice,
    submitAnswer,
    saveSessionSnapshot,
    setAnswerQualityWarning,
    setSafetyNotice,
  } = useSessionSubmit({
    sessionId, context, stageId, stageTitle: stage.title, currentQuestion, records, finalNote, lang,
    provider, model, userApiKey, currentChildId, pendingHistoryInsight: null,
    addProcessRecord,
    addRecordAndAdvance,
    setFinalNote: session.setFinalNote,
    setLastClarificationFeedback,
    setSuppressClarifyForNextStage,
    setProviderStatus,
  });

  // Progress
  const progress = isCompleted ? 100 : Math.min(100, Math.round((completedStages / stageCount) * 100));

  const handleAcceptConsent = useCallback(async () => {
    if (isAcceptingConsent) return;
    setIsAcceptingConsent(true);
    try {
      const response = await fetch("/api/children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept-consent" }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.child) throw new Error("Consent was not saved");
      ChildrenStorage.upsertLocalChild(payload.child);
      setCurrentChildId(payload.child.id);
      setCurrentChildName(payload.child.name);
      setIsRegistered(true);
      setAccessState("ready");
    } catch {
      setAccessState("error");
    } finally {
      setIsAcceptingConsent(false);
    }
  }, [isAcceptingConsent]);

  // Restart handler
  const handleRestart = useCallback(() => {
    resetSession();
    setShowHistory(false);
    setFeedbackSubmitted(false);
    setSuppressClarifyForNextStage(false);
    setAnswerQualityWarning(null);
  }, [resetSession, setAnswerQualityWarning, setSuppressClarifyForNextStage]);

  // Provider change handler
  const handleProviderChange = useCallback((nextProvider: ProviderId) => {
    if (!isProviderEnabledInRelease(nextProvider)) {
      return;
    }
    setProvider(nextProvider);
    setKeyStatus({ isValid: null, isTesting: false, hasSavedKey: false });
    setModel(getProviderMeta(nextProvider).defaultModel);
    
    setProviderStatus(nextProvider === "mock" ? ui.mockStatus : `${nextProvider}: ready`);
  }, [setProviderStatus, ui.mockStatus]);

  // Skip clarification handler
  const handleSkipClarification = useCallback(async () => {
    if (!lastClarificationFeedback) return;
    const adv = skipClarification(answer, currentQuestion, stage.title);
    if (adv?.completed && !finalNote) {
      const note = buildSessionSummary(context, adv.nextRecords, lang);
      session.setFinalNote(note);
    }
  }, [lastClarificationFeedback, skipClarification, answer, currentQuestion, stage.title, finalNote, context, lang, session]);

  const handleNeedClarification = useCallback(() => {
    if (lastClarificationFeedback) return;
    const result = addClarificationRequest(currentQuestion, stage.title);
    saveSessionSnapshot(result.nextRecords, "");
    setAnswerQualityWarning(null);
    setSuppressClarifyForNextStage(false);
  }, [lastClarificationFeedback, addClarificationRequest, currentQuestion, stage.title, saveSessionSnapshot, setAnswerQualityWarning, setSuppressClarifyForNextStage]);

  const handleClearClarificationAndRetry = useCallback(() => {
    if (clarifyResetTimeoutRef.current) {
      clearTimeout(clarifyResetTimeoutRef.current);
    }

    setLastClarificationFeedback(null);
    updateAnswer("");
    setSuppressClarifyForNextStage(false);
    setJustClearedClarify(true);
    clarifyResetTimeoutRef.current = setTimeout(() => {
      setJustClearedClarify(false);
      clarifyResetTimeoutRef.current = null;
    }, 4000);
  }, [setLastClarificationFeedback, setSuppressClarifyForNextStage, updateAnswer]);

  useEffect(() => {
    return () => {
      if (clarifyResetTimeoutRef.current) {
        clearTimeout(clarifyResetTimeoutRef.current);
      }
    };
  }, []);

  const handleGoBack = useCallback(() => {
    const result = goBackOneStep();
    if (result) {
      saveSessionSnapshot(result.nextRecords, "");
    }
    setAnswerQualityWarning(null);
    setSuppressClarifyForNextStage(false);
  }, [goBackOneStep, saveSessionSnapshot, setAnswerQualityWarning, setSuppressClarifyForNextStage]);

  // Start new session after history review
  const handleStartNew = useCallback(() => {
    resetSession();
    setShowHistory(false);
  }, [resetSession]);

  // Handle form submit
  const handleSubmit = useCallback(async () => {
    const result = await submitAnswer(answer, suppressClarifyForNextStage);
    if (result.clarificationNeeded && result.clarifyFeedback) {
      setLastClarificationFeedback(result.clarifyFeedback);
    }
  }, [submitAnswer, answer, suppressClarifyForNextStage, setLastClarificationFeedback]);

  return (
    <main className="shell">
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => {
          localStorage.setItem("selfreg_onboarding_seen_adolescent", "1");
          setShowOnboarding(false);
        }}
        lang={lang}
        type="adolescent"
      />
      <div className="topbar app-header">
        <div>
          <p className="eyebrow">{ui.eyebrow}</p>
          <h1>{ui.title}</h1>
          <p className="muted">{ui.intro}</p>
        </div>
        <div className="action-row">
          <AuthButton lang={lang} />
          <LanguageToggle />
          <Link className="button secondary" href={withLang("/", lang)}>{ui.home}</Link>
          <Link className="button secondary" href={withLang("/teacher", lang)}>{ui.teacher}</Link>
        </div>
      </div>

      <section className="panel instruction">
        <h2>{ui.howTitle}</h2>
        <p>{ui.howText}</p>
      </section>

      <section className="prototype-layout">
        <div className="panel chat-panel">
          {/* Provider box */}
          <div className="provider-box">
            <div className="provider-row">
              <label className="field compact">
                <span>{ui.provider}</span>
                <select value={provider} onChange={(e) => handleProviderChange(e.target.value as ProviderId)}>
                  {getReleaseProviders().map((providerMeta) => {
                    const suffix = providerMeta.releaseStatus === "recommended"
                      ? lang === "en" ? " (recommended)" : " (рекомендуется)"
                      : providerMeta.releaseStatus === "advanced"
                        ? lang === "en" ? " (advanced)" : " (расширенный)"
                        : providerMeta.releaseStatus === "in-development"
                          ? lang === "en" ? " (in development)" : " (в разработке)"
                          : lang === "en" ? " (without external AI)" : " (без внешнего ИИ)";
                    return (
                      <option
                        key={providerMeta.id}
                        value={providerMeta.id}
                        disabled={!isProviderEnabledInRelease(providerMeta.id)}
                      >
                        {providerMeta.title}{suffix}
                      </option>
                    );
                  })}
                </select>
              </label>
              <label className="field compact">
                <span>{ui.model}</span>
                <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="openai/gpt-4o-mini" />
              </label>
            </div>

            {/* API Key Manager - session-only by default, persistent browser storage is opt-in. */}
            <ApiKeyManager
              lang={lang}
              provider={provider}
              model={model}
              onKeyChange={setUserApiKey}
              onStatusChange={handleKeyStatusChange}
            />

            <div className="flex-row gap-6 items-center flex-wrap mt-8">
              {keyStatus.isTesting ? (
                <span className="badge-status-testing">
                  {lang === "en" ? "Testing key..." : "Проверка ключа..."}
                </span>
              ) : keyStatus.isValid === true ? (
                <span className="badge-status-valid">
                  ✓ {lang === "en" ? "Key valid" : "Ключ работает"}
                </span>
              ) : keyStatus.isValid === false ? (
                <span className="badge-status-invalid">
                  ✗ {lang === "en" ? "Key invalid" : "Ключ не работает"}
                </span>
              ) : keyStatus.hasSavedKey ? (
                <span className="badge-status-saved">
                  {lang === "en" ? "Key saved, not tested" : "Ключ сохранён, не проверен"}
                </span>
              ) : null}
              <span className="muted small-text">{providerStatus}</span>
            </div>
          </div>

          {accessState !== "ready" && (
            <StudentAccessGate
              lang={lang}
              state={accessState}
              isAcceptingConsent={isAcceptingConsent}
              onAcceptConsent={handleAcceptConsent}
            />
          )}

          {/* Registration form */}
          {/*
          {!isRegistered && (!childIdFromUrl || childLookupFailed) && (
            <div className="panel mb-24">
              <h3 className="mt-0">{ui.registrationTitle}</h3>
              <p className="muted mb-16">{ui.registrationText}</p>
              <form onSubmit={handleRegister}>
                <label className="field">
                  <span>{ui.fullName}</span>
                  <input type="text" value={participantName} onChange={(e) => setParticipantName(e.target.value)} placeholder={ui.fullNamePlaceholder} required />
                </label>
                <label className="field">
                  <span>{ui.classLabel}</span>
                  <input type="text" value={participantClass} onChange={(e) => setParticipantClass(e.target.value)} placeholder={ui.classPlaceholder} required />
                </label>
                <label className="field">
                  <span>{ui.teacherCode}</span>
                  <input
                    type="text"
                    value={teacherCode}
                    onChange={(e) => setTeacherCode(e.target.value)}
                    placeholder={ui.teacherCodePlaceholder}
                  />
                </label>
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={consentGiven}
                    onChange={(e) => setConsentGiven(e.target.checked)}
                    required
                  />
                  <span>{ui.consentText}</span>
                </label>
                <div className="action-row mt-12">
                  <button type="submit" className="button" disabled={!consentGiven || isRegistering}>
                    {isRegistering ? (lang === "en" ? "Saving..." : "Сохраняю...") : ui.startSession}
                  </button>
                </div>
              </form>
            </div>
          )}

          {childIdFromUrl && childLookupAttempted && childLookupFailed && !hasActiveChild && (
            <div className="panel" style={{ marginBottom: 24, borderColor: "#e8b4b4", background: "#fff7f7" }}>
              <h3 className="mt-0">{lang === "en" ? "Link needs attention" : "Нужно проверить ссылку"}</h3>
              <p className="muted mb-0">
                {lang === "en"
                  ? "We could not find a saved participant for this child link. You can register again below or ask the teacher for an updated link."
                  : "Мы не нашли сохраненного участника по этой ссылке. Можно зарегистрироваться заново ниже или запросить у педагога новую ссылку."}
              </p>
            </div>
          )}
          */}

          {/* History review */}
          {accessState === "ready" && hasActiveChild && pastSessions.length > 0 && showHistory && (
            <HistoryReviewPanel
              ui={ui}
              pastSessions={pastSessions}
              onStartNew={handleStartNew}
              lang={lang}
            />
          )}

          {/* Main session content */}
          {accessState === "ready" && hasActiveChild && (!showHistory || pastSessions.length === 0) && (
            <>
              <label className="field">
                <span>{ui.context}</span>
                <input value={context} onChange={(e) => setContext(e.target.value)} placeholder={ui.contextPlaceholder} />
              </label>

              <div
                className="progress-line"
                role="progressbar"
                aria-label={lang === "en" ? "Session progress" : "Прогресс сессии"}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
              >
                <span style={{ width: `${progress}%` }} />
              </div>

              <div className="stage-pill">{lang === "en" ? `Step ${stage.id} of 5` : `Шаг ${stage.id} из 5`}: {stage.title}</div>

              {currentChildName && (
                <div className="bg-soft b-line br-6 p-10 fs-13 mb-12">
                  👤 {ui.sessionFor}: <strong>{currentChildName}</strong>
                </div>
              )}

              {isCompleted ? (
                <CompletionView
                  ui={ui}
                  finalNote={finalNote}
                  onRestart={handleRestart}
                  lang={lang}
                  childIdFromUrl={childIdFromUrl}
                  currentChildId={currentChildId}
                  isLinkedToTeacher={isLinkedToTeacher}
                  feedbackSubmitted={feedbackSubmitted}
                  onFeedbackSubmitted={() => setFeedbackSubmitted(true)}
                />
              ) : (
                <SessionForm
                  ui={ui}
                  currentQuestion={currentQuestion}
                  answer={answer}
                  updateAnswer={updateAnswer}
                  lastClarificationFeedback={lastClarificationFeedback}
                  lang={lang}
                  provider={provider}
                  isSending={isSending}
                  answerQualityWarning={answerQualityWarning}
                  safetyNotice={safetyNotice}
                  onSafetyNoticeClear={() => {
                    setSafetyNotice(null);
                    setAnswerQualityWarning(null);
                  }}
                  justClearedClarify={justClearedClarify}
                  onClearAndRetry={handleClearClarificationAndRetry}
                  onSkip={handleSkipClarification}
                  onSubmit={handleSubmit}
                  onRestart={handleRestart}
                  onNeedClarification={handleNeedClarification}
                  onGoBack={handleGoBack}
                  canGoBack={canGoBack}
                />
              )}
            </>
          )}
        </div>

        <aside className="panel">
          <h2>{ui.collected}</h2>
          {records.length === 0 ? (
            <p className="muted">{ui.empty}</p>
          ) : (
            <div className="record-list">
              {records.map((item, index) => (
                <article className="record" key={`${item.stageId}-${index}`}>
                  <div className="record-head">
                    <strong>{item.stageTitle}</strong>
                    <span>{item.scenario}</span>
                  </div>
                  <p>{item.feedback}</p>
                </article>
              ))}
            </div>
          )}
          {finalNote && <div className="final-note"><h3>{ui.result}</h3><p>{finalNote}</p></div>}
        </aside>
      </section>
    </main>
  );
}

// ========== UI Text Hook ==========

function useUiText(lang: "ru" | "en") {
  return {
    eyebrow: lang === "en" ? "Adolescent session" : "Сессия подростка",
    title: lang === "en" ? "Short self-regulation cycle" : "Короткий цикл саморегуляции",
    intro: lang === "en" ? "In 5-7 minutes choose a real situation, move through five steps, and get a clear recommendation." : "За 5-7 минут выбери реальную ситуацию, пройди пять шагов и получи понятную рекомендацию.",
    howTitle: lang === "en" ? "How to use it" : "Как пользоваться",
    howText: lang === "en" ? "Write about a situation where you want to cope better: study, project, sport, creativity, communication, or a habit." : "Напиши о ситуации, где хочешь справляться лучше: учеба, проект, спорт, творчество, общение или привычка.",
    home: lang === "en" ? "Home" : "Главная",
    teacher: lang === "en" ? "Teacher view" : "Педагогу",
    provider: lang === "en" ? "AI provider" : "ИИ-провайдер",
    model: lang === "en" ? "Model" : "Модель",
    key: lang === "en" ? "One-time API key" : "API-ключ",
    keyPlaceholder: lang === "en" ? "Not needed for mock" : "Для mock не нужен",
    context: lang === "en" ? "Context" : "Контекст",
    contextPlaceholder: lang === "en" ? "e.g.: exam, project" : "например: экзамен, проект",
    answerLabel: lang === "en" ? "Your answer" : "Твой ответ",
    answerPlaceholder: lang === "en" ? "Write 1-3 sentences" : "Напиши 1-3 предложения",
    submit: lang === "en" ? "Continue" : "Продолжить",
    sending: lang === "en" ? "Waiting for AI..." : "Жду ответ ИИ...",
    clarifyBtn: lang === "en" ? "Need clarification" : "Не понял вопрос",
    backBtn: lang === "en" ? "Go back" : "Назад",
    restart: lang === "en" ? "Start over" : "Начать заново",
    doneTitle: lang === "en" ? "Session completed" : "Сессия завершена",
    doneText: lang === "en" ? "Answers saved. You can open the dashboard or run the cycle again." : "Ответы сохранены. Можно открыть дашборд или пройти цикл заново.",
    collected: lang === "en" ? "Collected" : "Собрано",
    empty: lang === "en" ? "No answers yet." : "Пока нет ответов.",
    result: lang === "en" ? "Summary" : "Итог",
    sessionFor: lang === "en" ? "Session for" : "Сессия для",
    registrationTitle: lang === "en" ? "Session registration" : "Регистрация сессии",
    registrationText: lang === "en" ? "Enter your name so the teacher can see your results." : "Введи имя, чтобы педагог увидел результаты.",
    fullName: lang === "en" ? "Full name" : "ФИО",
    fullNamePlaceholder: lang === "en" ? "Ivanov Ivan" : "Иванов Иван",
    classLabel: lang === "en" ? "Class" : "Класс",
    classPlaceholder: lang === "en" ? "9A" : "9А",
    startSession: lang === "en" ? "Start" : "Начать",
    mockStatus: lang === "en" ? "Mock mode: no external key needed" : "Mock-режим: ключ не нужен",
    teacherCode: lang === "en" ? "Teacher code (optional)" : "Код учителя (опционально)",
    teacherCodePlaceholder: lang === "en" ? "Enter code" : "Введите код",
    consentText: lang === "en" ? "I consent to the processing of personal data for the purposes of the SelfReg AI project" : "Я согласен на обработку персональных данных для целей проекта SelfReg AI",
    historyTitle: lang === "en" ? "Your history" : "Ваша история",
    historyLatestLabel: lang === "en" ? "Latest session" : "Последняя сессия",
    historyAiButton: lang === "en" ? "Get AI comment" : "Получить комментарий от ИИ",
    historyAiGenerating: lang === "en" ? "Generating..." : "Генерирую...",
    historyAiLabel: lang === "en" ? "AI Insight:" : "Комментарий ИИ:",
    historyStartNew: lang === "en" ? "Start new session" : "Начать новую сессию",
  };
}

function StudentAccessGate({
  lang,
  state,
  isAcceptingConsent,
  onAcceptConsent,
}: {
  lang: AppLang;
  state: "checking" | "signed-out" | "wrong-role" | "consent" | "error";
  isAcceptingConsent: boolean;
  onAcceptConsent: () => void;
}) {
  const copy = lang === "en"
    ? {
        checking: "Checking your student account…",
        signOutTitle: "Sign in to start a personal session",
        signOutText: "Sessions belong to a student account so your history does not mix with another browser profile.",
        consentTitle: "Confirm data processing before your first session",
        consentText: "Your account keeps your session history. Confirm consent to save your answers in your personal dashboard.",
        wrongRoleTitle: "This screen is for student accounts",
        wrongRoleText: "Open the teacher dashboard with a teacher account, or sign in with a student account to begin a session.",
        errorTitle: "We could not open the student profile",
        errorText: "Refresh the page or sign in again. No guest session was created.",
        signIn: "Sign in",
        register: "Create student account",
        accept: "I agree and continue",
        teacher: "Open teacher dashboard",
      }
    : {
        checking: "Проверяем аккаунт ученика…",
        signOutTitle: "Войдите, чтобы начать личную сессию",
        signOutText: "Сессии привязаны к аккаунту ученика: так история не смешивается с данными другого профиля в браузере.",
        consentTitle: "Подтвердите обработку данных до первой сессии",
        consentText: "Аккаунт хранит историю ваших сессий. Подтвердите согласие, чтобы сохранять ответы в личном кабинете.",
        wrongRoleTitle: "Этот экран предназначен для аккаунта ученика",
        wrongRoleText: "Откройте кабинет педагога с аккаунтом педагога или войдите как ученик, чтобы начать сессию.",
        errorTitle: "Не удалось открыть профиль ученика",
        errorText: "Обновите страницу или войдите снова. Гостевая сессия не была создана.",
        signIn: "Войти",
        register: "Создать аккаунт ученика",
        accept: "Соглашаюсь и продолжаю",
        teacher: "Открыть кабинет педагога",
      };

  if (state === "checking") {
    return <div className="panel mb-24"><p className="muted m-0">{copy.checking}</p></div>;
  }

  const isSignedOut = state === "signed-out";
  const isConsent = state === "consent";
  const title = isSignedOut ? copy.signOutTitle : isConsent ? copy.consentTitle : state === "wrong-role" ? copy.wrongRoleTitle : copy.errorTitle;
  const text = isSignedOut ? copy.signOutText : isConsent ? copy.consentText : state === "wrong-role" ? copy.wrongRoleText : copy.errorText;

  return (
    <section className="panel mb-24" aria-live="polite">
      <h3 className="mt-0">{title}</h3>
      <p className="muted mb-16">{text}</p>
      <div className="action-row">
        {isSignedOut && (
          <>
            <Link className="button" href={withLang("/auth/login?role=student", lang)}>{copy.signIn}</Link>
            <Link className="button secondary" href={withLang("/auth/register?role=student", lang)}>{copy.register}</Link>
          </>
        )}
        {isConsent && <button className="button" type="button" onClick={onAcceptConsent} disabled={isAcceptingConsent}>{isAcceptingConsent ? "…" : copy.accept}</button>}
        {state === "wrong-role" && <Link className="button" href={withLang("/teacher", lang)}>{copy.teacher}</Link>}
        {state === "error" && <Link className="button" href={withLang("/auth/login?role=student", lang)}>{copy.signIn}</Link>}
      </div>
    </section>
  );
}

// ========== Sub-components ==========

function HistoryReviewPanel({
  ui, pastSessions, onStartNew, lang
}: {
  ui: ReturnType<typeof useUiText>;
  pastSessions: CompletedSession[];
  onStartNew: () => void;
  lang: AppLang;
}) {
  return (
    <div className="panel mb-24 bg-soft">
      <h3 className="mt-0">{ui.historyTitle}</h3>
      <p className="muted mb-12">
        {lang === "en" ? "Completed " : "Пройдено "}<strong>{pastSessions.length}</strong>
        {lang === "en" ? (pastSessions.length === 1 ? " session" : " sessions") : pastSessions.length === 1 ? " сессия" : pastSessions.length < 5 ? " сессии" : " сессий"}
      </p>

      {pastSessions[0] && (
        <div className="b-line br-6 p-12 mb-16 bg-white">
          <div className="fs-11 fw-600 c-accent mb-4">{ui.historyLatestLabel}</div>
          <div className="fs-12 c-muted mb-4">{new Date(pastSessions[0].updatedAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'ru-RU')}</div>
          <div className="fw-600 mb-6">{pastSessions[0].context}</div>
          <div style={{ fontSize: 13, lineHeight: 1.4 }}>{pastSessions[0].finalNote}</div>
        </div>
      )}

      <div className="mt-16">
        <button className="button secondary" onClick={onStartNew}>{ui.historyStartNew}</button>
      </div>
    </div>
  );
}

function CompletionView({
  ui, finalNote, onRestart, lang, childIdFromUrl, currentChildId, isLinkedToTeacher, feedbackSubmitted, onFeedbackSubmitted
}: {
  ui: ReturnType<typeof useUiText>;
  finalNote: string;
  onRestart: () => void;
  lang: AppLang;
  childIdFromUrl: string | null;
  currentChildId: string | null;
  isLinkedToTeacher: boolean;
  feedbackSubmitted: boolean;
  onFeedbackSubmitted: () => void;
}) {
  const effectiveChildId = childIdFromUrl || currentChildId;

  return (
    <div className="final-note">
      <h3>{ui.doneTitle}</h3>
      <p>{finalNote}</p>
      <p className="muted">{ui.doneText}</p>
      <div className="action-row mt-16">
        {effectiveChildId && (
          <Link className="button" href={`/student/dashboard?lang=${lang}`}>
            {lang === "en" ? "Open dashboard" : "Открыть кабинет"}
          </Link>
        )}
        <button className="button secondary" type="button" onClick={onRestart}>{ui.restart}</button>
      </div>
      {effectiveChildId ? (
        <p className="muted fs-13 mt-12">
          {isLinkedToTeacher
            ? (lang === "en" ? "Results are saved in your dashboard and available to the linked teacher." : "Результаты сохранены в кабинете и доступны привязанному педагогу.")
            : (lang === "en" ? "Results are saved in your personal dashboard." : "Результаты сохранены в личном кабинете.")}
        </p>
      ) : (
        <p className="muted fs-13 mt-12">{lang === "en" ? "You can start over anytime." : "Можно начать заново в любое время."}</p>
      )}
      {!feedbackSubmitted && effectiveChildId && <AdolescentFeedbackForm lang={lang} childIdFromUrl={childIdFromUrl} currentChildId={currentChildId} onSubmitted={onFeedbackSubmitted} />}
      {feedbackSubmitted && <p className="fs-13 c-accent mt-8">{lang === "en" ? "Feedback saved." : "Обратная связь сохранена."}</p>}
    </div>
  );
}

function SessionForm({
  ui, currentQuestion, answer, updateAnswer, lastClarificationFeedback, lang, provider, isSending,
  answerQualityWarning, safetyNotice, onSafetyNoticeClear, justClearedClarify, onClearAndRetry, onSkip, onSubmit, onRestart,
  onNeedClarification, onGoBack, canGoBack
}: {
  ui: ReturnType<typeof useUiText>;
  currentQuestion: string;
  answer: string;
  updateAnswer: (v: string) => void;
  lastClarificationFeedback: string | null;
  lang: AppLang;
  provider: ProviderId;
  isSending: boolean;
  answerQualityWarning: string | null;
  safetyNotice: import("@/types/session").SafetyResult | null;
  onSafetyNoticeClear: () => void;
  justClearedClarify: boolean;
  onClearAndRetry: () => void;
  onSkip: () => void;
  onSubmit: () => Promise<void>;
  onRestart: () => void;
  onNeedClarification: () => void;
  onGoBack: () => void;
  canGoBack: boolean;
}) {
  return (
    <>
      <div className="question-box"><p>{currentQuestion}</p></div>

      {lastClarificationFeedback && (
        <ClarificationBox
          feedback={lastClarificationFeedback}
          provider={provider}
          lang={lang}
          onClearAndRetry={onClearAndRetry}
          onSkip={onSkip}
        />
      )}

      <label className="field">
        <span>{ui.answerLabel}</span>
        <textarea value={answer} onChange={(e) => { updateAnswer(e.target.value); onSafetyNoticeClear(); }} rows={5} placeholder={ui.answerPlaceholder} />
      </label>

      {safetyNotice && (
        <div role="alert" style={{ background: "#fff1f2", border: "2px solid #e11d48", borderRadius: 8, padding: "12px 14px", fontSize: 14, marginBottom: 12, color: "#881337" }}>
          {safetyNotice.message}
        </div>
      )}

      {answerQualityWarning && !safetyNotice && (
        <div style={{ background: '#fff8e1', border: '1px solid #f0d36f', borderRadius: 6, padding: '8px 12px', fontSize: 13, marginBottom: 8, color: '#664e03' }}>
          {answerQualityWarning}
        </div>
      )}

      {justClearedClarify && (
        <div className="fs-12 c-accent mb-8">
          {lang === "en" ? "Recommendation cleared. Write your answer and submit." : "Рекомендация убрана. Напиши ответ и нажми «Ответить»."}
        </div>
      )}

      <div className="action-row">
        {/* Secondary actions on the left */}
        <div className="flex-row gap-6">
          <button className="button secondary" type="button" onClick={onNeedClarification} disabled={isSending || Boolean(lastClarificationFeedback)}>
            💬 {ui.clarifyBtn}
          </button>
          <button className="button secondary" type="button" onClick={onGoBack} disabled={isSending || !canGoBack}>
            ← {ui.backBtn}
          </button>
        </div>
        
        {/* Primary action */}
        <button className="button" type="button" onClick={onSubmit} disabled={isSending} aria-busy={isSending} style={{ flex: 1, maxWidth: 200 }}>
          {isSending ? ui.sending : ui.submit}
        </button>
        
        {/* Restart on the right */}
        <button className="button secondary" type="button" onClick={onRestart}>{ui.restart}</button>
      </div>
    </>
  );
}

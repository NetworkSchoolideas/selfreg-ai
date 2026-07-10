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
import { DEFAULT_LIVE_MODEL, DEFAULT_LIVE_PROVIDER, type ProviderId } from "@/lib/provider-registry";
import { ConsentModal } from "@/app/components/ConsentModal";
import { createChildId } from "@/lib/children-storage";
import { DataService } from "@/lib/data-service";
import type { RecordItem, CompletedSession } from "@/types/session";
import { useSessionSubmit } from "@/hooks/useSessionSubmit";
import { useSessionHistory } from "@/hooks/useSessionHistory";
import { buildSessionSummary } from "@/lib/session-summary";
import { resolveTeacherLinkContext } from "@/lib/teacher-link";

const STORAGE_KEY = "selfreg_demo_session";

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
    answer, updateAnswer, pendingHistoryInsight, setPendingHistoryInsight,
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
  const [participantName, setParticipantName] = useState("");
  const [participantClass, setParticipantClass] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [teacherCode, setTeacherCode] = useState(initialTeacherCode);

  // UI-only state
  const [showHistory, setShowHistory] = useState(() => sessionMode !== "new" && !resumeSessionId);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [justClearedClarify, setJustClearedClarify] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [childLookupAttempted, setChildLookupAttempted] = useState(false);
  const [childLookupFailed, setChildLookupFailed] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const clarifyResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasActiveChild = isRegistered || Boolean(currentChildId);

  const linkChildToTeacherByCode = useCallback(async (childId: string, rawTeacherCode: string) => {
    const normalizedTeacherCode = rawTeacherCode.trim();
    if (!normalizedTeacherCode) {
      return;
    }

    try {
      const joinResponse = await fetch("/api/join-teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherCode: normalizedTeacherCode, childId }),
      });

      if (!joinResponse.ok) {
        return;
      }

      await joinResponse.json();
    } catch (err) {
      console.error("[Join Teacher] Error:", err);
    }
  }, []);

  // Onboarding check on first visit
  useEffect(() => {
    queueMicrotask(() => {
      const seen = localStorage.getItem("selfreg_onboarding_seen_adolescent");
      if (!seen) setShowOnboarding(true);
    });
  }, []);

  // Consent handlers
  const handleConsent = useCallback(() => {
    setConsentGiven(true);
    setShowConsentModal(false);
  }, []);

  const handleDeclineConsent = useCallback(() => {
    setConsentGiven(false);
    setShowConsentModal(false);
  }, []);

  // Load child info from URL on mount
  useEffect(() => {
    let active = true;

    const loadChild = async () => {
      if (!childIdFromUrl) return;

      // 1. Пробуем DataService (Supabase → localStorage)
      const found = await DataService.getChild(childIdFromUrl);
      if (found && active) {
        await linkChildToTeacherByCode(found.id, teacherCode);
        const resumeSession = resumeSessionId
          ? found.sessions?.find((item) => item.sessionId === resumeSessionId)
          : null;
        if (resumeSession) {
          restoreSession(resumeSession);
          setShowHistory(false);
        } else if (sessionMode === "new") {
          resetSession();
          setShowHistory(false);
        }
        const sessionsCount = found.sessions?.length || 0;
        const name = sessionsCount > 0 ? `${found.name} (${sessionsCount})` : found.name;
        setCurrentChildName(name);
        setCurrentChildId(found.id);
        setIsRegistered(true);
        setChildLookupAttempted(true);
        setChildLookupFailed(false);
        return;
      }

      // 2. Запасной вариант: API
      try {
        const response = await fetch(`/api/children?childId=${encodeURIComponent(childIdFromUrl)}`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("API not available");

        const payload = await response.json();
        if (!active || !payload?.child) throw new Error("No child in response");

        await DataService.saveChild(payload.child);
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

        const sessionsCount = payload.child.sessions?.length || 0;
        const name = sessionsCount > 0 ? `${payload.child.name} (${sessionsCount})` : payload.child.name;
        setCurrentChildName(name);
        setCurrentChildId(payload.child.id);
        setIsRegistered(true);
        setChildLookupAttempted(true);
        setChildLookupFailed(false);
        return;
      } catch {}

      if (active) {
        setChildLookupAttempted(true);
        setChildLookupFailed(true);
      }
    };

    void loadChild();

    return () => {
      active = false;
    };
  }, [childIdFromUrl, teacherCode, linkChildToTeacherByCode, resetSession, restoreSession, resumeSessionId, sessionMode]);

  // Restore pending history insight after refresh
  useEffect(() => {
    const effectiveId = childIdFromUrl || currentChildId;
    if (effectiveId && !pendingHistoryInsight) {
      try {
        const saved = sessionStorage.getItem(`history_insight_${effectiveId}`);
        if (saved) {
          setPendingHistoryInsight(saved);
          sessionStorage.removeItem(`history_insight_${effectiveId}`);
        }
      } catch {}
    }
  }, [childIdFromUrl, currentChildId, pendingHistoryInsight, setPendingHistoryInsight]);

  // History hook
  const { pastSessions, historyAIComment, isLoadingHistoryAI, generateHistoryInsight } = useSessionHistory({
    childId: currentChildId,
    lang,
    provider,
    model,
    userApiKey,
  });

  // Submit hook
  const [providerStatus, setProviderStatus] = useState(`${DEFAULT_LIVE_PROVIDER}: ready`);
  const { isSending, answerQualityWarning, submitAnswer, saveSessionSnapshot, setAnswerQualityWarning } = useSessionSubmit({
    sessionId, context, stageId, stageTitle: stage.title, currentQuestion, records, finalNote, lang,
    provider, model, userApiKey, currentChildId, pendingHistoryInsight,
    addProcessRecord,
    addRecordAndAdvance,
    setFinalNote: session.setFinalNote,
    setLastClarificationFeedback,
    setSuppressClarifyForNextStage,
    setProviderStatus,
  });

  // Progress
  const progress = isCompleted ? 100 : Math.min(100, Math.round((completedStages / stageCount) * 100));

  // Registration handler
  const handleRegister = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const fio = participantName.trim();
    const klass = participantClass.trim();
    if (!fio || !klass || !consentGiven || isRegistering) return;

    const anonId = generateAnonId(fio, klass);
    const enteredTeacherCode = teacherCode.trim();
    const teacherId = teacherIdFromUrl || undefined;
    const consentTimestamp = new Date().toISOString();

    setIsRegistering(true);
    try {
      const response = await fetch("/api/children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: anonId,
          name: fio,
          className: klass,
          teacherId,
          consentGiven: true,
          consentTimestamp,
          realData: { fio, klass },
        }),
      });

      if (response.ok) {
        const payload = await response.json();
        if (payload?.child) {
          await DataService.saveChild(payload.child);
          await linkChildToTeacherByCode(payload.child.id, enteredTeacherCode);
          setCurrentChildId(payload.child.id);
          setCurrentChildName(`${fio} (${klass})`);
          setIsRegistered(true);
          setChildLookupFailed(false);
          return;
        }
      }
    } catch {}

    const now = new Date().toISOString();
    const localChild: import("@/types/session").ChildProfile = {
      id: anonId,
      name: anonId,
      createdAt: now,
      updatedAt: now,
      sessions: [],
      realData: { fio: fio.trim(), klass: klass.trim() },
      teacherId,
      consentGiven: true,
      consentTimestamp,
    };
    await DataService.saveChild(localChild);
    await linkChildToTeacherByCode(localChild.id, enteredTeacherCode);
    setCurrentChildId(localChild.id);
    setCurrentChildName(`${fio} (${klass})`);
    setIsRegistered(true);
    setChildLookupFailed(false);
    setIsRegistering(false);
  }, [participantName, participantClass, consentGiven, teacherCode, teacherIdFromUrl, isRegistering, linkChildToTeacherByCode]);

  // Restart handler
  const handleRestart = useCallback(() => {
    resetSession();
    setShowHistory(true);
    setFeedbackSubmitted(false);
    setSuppressClarifyForNextStage(false);
    setAnswerQualityWarning(null);
    setKeyStatus({ isValid: null, isTesting: false, hasSavedKey: false });
    setProviderStatus(ui.mockStatus);
    window.localStorage.removeItem(STORAGE_KEY);
  }, [resetSession, setAnswerQualityWarning, setProviderStatus, setSuppressClarifyForNextStage, ui.mockStatus]);

  // Provider change handler
  const handleProviderChange = useCallback((nextProvider: ProviderId) => {
    setProvider(nextProvider);
    setKeyStatus({ isValid: null, isTesting: false, hasSavedKey: false });
    // Set default model based on provider
    if (nextProvider === "gigachat") setModel("GigaChat");
    else if (nextProvider === "openrouter") setModel("openrouter/free");
    else if (nextProvider === "github-models") setModel(DEFAULT_LIVE_MODEL);
    else if (nextProvider === "vercel-gateway") setModel("openai/gpt-oss-120b");
    else setModel("local-mock");
    
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

  // Generate history insight handler
  const handleGenerateInsight = useCallback(async () => {
    await generateHistoryInsight();
  }, [generateHistoryInsight]);

  // Start new session after history review
  const handleStartNew = useCallback(() => {
    if (historyAIComment) {
      setPendingHistoryInsight(historyAIComment);
      const effectiveId = childIdFromUrl || currentChildId;
      if (effectiveId) {
        try {
          sessionStorage.setItem(`history_insight_${effectiveId}`, historyAIComment);
        } catch {}
      }
    }
    resetSession();
    setShowHistory(false);
  }, [historyAIComment, childIdFromUrl, currentChildId, resetSession, setPendingHistoryInsight]);

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
                  <option value="mock">Mock</option>
                  <option value="github-models">GitHub Models (recommended)</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="gigachat">GigaChat (Direct)</option>
                  <option value="vercel-gateway">Vercel AI Gateway (experimental)</option>
                </select>
              </label>
              <label className="field compact">
                <span>{ui.model}</span>
                <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="GigaChat, openai/gpt-4o-mini" />
              </label>
            </div>

            {/* API Key Manager - persistent per user per provider */}
            <ApiKeyManager
              lang={lang}
              provider={provider}
              onKeyChange={(savedKey) => setUserApiKey(savedKey)}
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

          {/* Registration form */}
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

          {/* History review */}
          {hasActiveChild && pastSessions.length > 0 && showHistory && (
            <HistoryReviewPanel
              ui={ui}
              pastSessions={pastSessions}
              provider={provider}
              model={model}
              userApiKey={userApiKey}
              historyAIComment={historyAIComment}
              isLoadingHistoryAI={isLoadingHistoryAI}
              onGenerateInsight={handleGenerateInsight}
              onStartNew={handleStartNew}
              lang={lang}
            />
          )}

          {/* Main session content */}
          {hasActiveChild && (!showHistory || pastSessions.length === 0) && (
            <>
              <label className="field">
                <span>{ui.context}</span>
                <input value={context} onChange={(e) => setContext(e.target.value)} placeholder={ui.contextPlaceholder} />
              </label>

              <div className="progress-line" aria-label={`Progress ${progress}%`}>
                <span style={{ width: `${progress}%` }} />
              </div>

              <div className="stage-pill">{lang === "en" ? `Step ${stage.id} of 5` : `Шаг ${stage.id} из 5`}: {stage.title}</div>

              {currentChildName && (
                <div className="bg-soft b-line br-6 p-10 fs-13 mb-12">
                  👤 Сессия для: <strong>{currentChildName}</strong>
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

function generateAnonId(_fio: string, _klass: string): string {
  return createChildId();
}

// ========== Sub-components ==========

function HistoryReviewPanel({
  ui, pastSessions, provider, historyAIComment, isLoadingHistoryAI,
  onGenerateInsight, onStartNew, lang
}: {
  ui: ReturnType<typeof useUiText>;
  pastSessions: CompletedSession[];
  provider: ProviderId;
  model?: string;
  userApiKey?: string;
  historyAIComment: string | null;
  isLoadingHistoryAI: boolean;
  onGenerateInsight: () => Promise<void>;
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

      <div className="mt-12">
        {provider !== 'mock' ? (
          <button className="button" disabled={isLoadingHistoryAI} onClick={onGenerateInsight}>
            {isLoadingHistoryAI ? ui.historyAiGenerating : ui.historyAiButton}
          </button>
        ) : (
          <div className="p-12 bg-white b-dashed br-6 fs-13 c-muted">
            {lang === "en" ? "Connect a provider to get AI insights" : "Подключите провайдера для AI-комментариев"}
          </div>
        )}
      </div>

      {historyAIComment && (
        <div style={{ marginTop: 12, padding: 12, background: '#f0f7ff', border: '1px solid var(--accent)', borderRadius: 6, fontSize: 13, lineHeight: 1.45 }}>
          <div className="fw-600 mb-4 c-accent">{ui.historyAiLabel}</div>
          <p className="m-0">{historyAIComment}</p>
        </div>
      )}

      <div className="mt-16">
        <button className="button secondary" onClick={onStartNew}>{ui.historyStartNew}</button>
      </div>
    </div>
  );
}

function CompletionView({
  ui, finalNote, onRestart, lang, childIdFromUrl, currentChildId, feedbackSubmitted, onFeedbackSubmitted
}: {
  ui: ReturnType<typeof useUiText>;
  finalNote: string;
  onRestart: () => void;
  lang: AppLang;
  childIdFromUrl: string | null;
  currentChildId: string | null;
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
        <button className="button secondary" type="button" onClick={onRestart}>{ui.restart}</button>
      </div>
      {effectiveChildId ? (
        <p className="muted fs-13 mt-12">{lang === "en" ? "Results saved for teacher." : "Результаты сохранены для педагога."}</p>
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
  answerQualityWarning, justClearedClarify, onClearAndRetry, onSkip, onSubmit, onRestart,
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
        <textarea value={answer} onChange={(e) => { updateAnswer(e.target.value); if (answerQualityWarning) updateAnswer(e.target.value); }} rows={5} placeholder={ui.answerPlaceholder} />
      </label>

      {answerQualityWarning && (
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

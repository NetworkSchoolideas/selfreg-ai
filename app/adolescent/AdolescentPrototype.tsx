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
  getProviderMeta,
  getReleaseProviders,
  isProviderEnabledInRelease,
  type ProviderId,
} from "@/lib/provider-registry";
import { ChildrenStorage } from "@/lib/children-storage";
import type { RecordItem, CompletedSession, Session } from "@/types/session";
import { useSessionSubmit } from "@/hooks/useSessionSubmit";
import { useSessionHistory } from "@/hooks/useSessionHistory";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { buildSessionSummary } from "@/lib/session-summary";
import { sessionManager } from "@/lib/session-manager";
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
  const { user: authUser, isLoading: isAuthLoading } = useSupabaseAuth();
  const authUserId = authUser?.id;
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
    sessionId, context, setContext, stageId, stage, records, setRecords, finalNote,
    lastClarificationFeedback, setLastClarificationFeedback,
    answer, updateAnswer,
    currentQuestion, isCompleted, completedStages, stageCount,
    addProcessRecord, addRecordAndAdvance, skipClarification, resetSession,
    suppressClarifyForNextStage, setSuppressClarifyForNextStage,
    canGoBack, addClarificationRequest, goBackOneStep, restoreSession
  } = session;

  // Provider and model state
  const [provider, setProvider] = useState<ProviderId>("mock");
  const [model, setModel] = useState(() => getProviderMeta("mock").defaultModel);
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
  const [isIndependentSession, setIsIndependentSession] = useState(false);
  const [independentSessionStorageKey, setIndependentSessionStorageKey] = useState<string | null>(null);
  const [sessionOwnerId, setSessionOwnerId] = useState<string | null>(null);
  const [teacherCode, setTeacherCode] = useState(initialTeacherCode);

  // UI-only state
  const [showHistory, setShowHistory] = useState(() => sessionMode !== "new" && !resumeSessionId);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [justClearedClarify, setJustClearedClarify] = useState(false);
  const [accessState, setAccessState] = useState<"checking" | "ready" | "signed-out" | "wrong-role" | "consent" | "error">("checking");
  const [isAcceptingConsent, setIsAcceptingConsent] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isPersistingSessionAction, setIsPersistingSessionAction] = useState(false);
  const clarifyResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedSessionRouteRef = useRef<string | null>(null);
  // Never keep an in-memory draft visible after the authenticated account has
  // changed. This protects the boundary between a teacher's personal session
  // and a student's profile without coupling either workflow to the other.
  const ownsVisibleSession = Boolean(authUserId) && sessionOwnerId === authUserId;
  const hasSessionAccess = ownsVisibleSession && (
    isIndependentSession || isRegistered || Boolean(currentChildId)
  );
  const effectiveAccessState: typeof accessState = !authUserId
    ? (isAuthLoading ? "checking" : "signed-out")
    : !ownsVisibleSession
      ? "checking"
      : accessState;

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

        const sessionRouteKey = [
          authSession.user.id,
          childIdFromUrl || "current",
          sessionMode || "default",
          resumeSessionId || "none",
        ].join(":");
        const shouldInitializeSessionRoute = initializedSessionRouteRef.current !== sessionRouteKey;

        const startIndependentSession = () => {
          if (!active) return;

          // A teacher may use the exercise personally, but never through a
          // student profile. Keep the draft browser-only and namespaced to the
          // authenticated account so it cannot mix with another user's data.
          const localSessionKey = `selfreg_personal_session:${authSession.user.id}`;
          if (shouldInitializeSessionRoute) {
            if (sessionMode === "new" || resumeSessionId) {
              sessionManager.clearLocalSession(localSessionKey);
              resetSession();
              setFeedbackSubmitted(false);
            } else {
              const savedSession = sessionManager.loadLocalSession(localSessionKey);
              if (savedSession) {
                restoreSession(savedSession);
                setFeedbackSubmitted(Boolean(savedSession.adolescentFeedback));
              }
            }
            initializedSessionRouteRef.current = sessionRouteKey;
          }
          setCurrentChildName(null);
          setCurrentChildId(null);
          setIsRegistered(false);
          setIsLinkedToTeacher(false);
          setIndependentSessionStorageKey(localSessionKey);
          setSessionOwnerId(authSession.user.id);
          setIsIndependentSession(true);
          setShowHistory(false);
          setAccessState("ready");
        };

        if (authSession.user.user_metadata?.preferred_role === "teacher") {
          startIndependentSession();
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
          startIndependentSession();
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

        if (shouldInitializeSessionRoute) {
          const resumeSession = resumeSessionId
            ? payload.child.sessions?.find((item: import("@/types/session").Session) => item.sessionId === resumeSessionId)
            : null;
          if (resumeSession) {
            restoreSession(resumeSession);
            setFeedbackSubmitted(Boolean(resumeSession.adolescentFeedback));
            setShowHistory(false);
          } else if (sessionMode === "new") {
            resetSession();
            setFeedbackSubmitted(false);
            setShowHistory(false);
          }
          initializedSessionRouteRef.current = sessionRouteKey;
        }

        setCurrentChildName(payload.child.name);
        setCurrentChildId(payload.child.id);
        setIsRegistered(true);
        setIsLinkedToTeacher(Boolean(payload.child.teacherId));
        setIndependentSessionStorageKey(null);
        setSessionOwnerId(authSession.user.id);
        setIsIndependentSession(false);
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
  }, [authUserId, childIdFromUrl, teacherCode, linkChildToTeacherByCode, resetSession, restoreSession, resumeSessionId, sessionMode]);

  // History is read-only in the release contour. AI summary over past sessions is deferred.
  const { pastSessions } = useSessionHistory({
    childId: currentChildId,
    lang,
    provider,
    model,
    userApiKey,
  });

  // Submit hook
  const [providerStatus, setProviderStatus] = useState(ui.mockStatus);
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
    provider, model, userApiKey, currentChildId, localSessionStorageKey: independentSessionStorageKey ?? undefined, pendingHistoryInsight: null,
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

  const replaceStudentSessionRoute = useCallback((nextSessionId: string | null) => {
    if (!currentChildId || isIndependentSession) return;

    const params = new URLSearchParams({ childId: currentChildId, lang });
    if (nextSessionId) {
      params.set("resumeSessionId", nextSessionId);
    } else {
      params.set("mode", "new");
    }
    window.history.replaceState(null, "", `/adolescent?${params.toString()}`);
  }, [currentChildId, isIndependentSession, lang]);

  // Restart handler
  const handleRestart = useCallback(() => {
    if (independentSessionStorageKey) {
      sessionManager.clearLocalSession(independentSessionStorageKey);
    }
    resetSession();
    setShowHistory(false);
    setFeedbackSubmitted(false);
    setSuppressClarifyForNextStage(false);
    setAnswerQualityWarning(null);
    replaceStudentSessionRoute(null);
  }, [independentSessionStorageKey, replaceStudentSessionRoute, resetSession, setAnswerQualityWarning, setSuppressClarifyForNextStage]);

  // Provider change handler
  const handleProviderChange = useCallback((nextProvider: ProviderId) => {
    if (!isProviderEnabledInRelease(nextProvider)) {
      return;
    }
    setProvider(nextProvider);
    setKeyStatus({ isValid: null, isTesting: false, hasSavedKey: false });
    setModel(getProviderMeta(nextProvider).defaultModel);
    
    setProviderStatus(nextProvider === "mock" ? ui.mockStatus : "");
  }, [setProviderStatus, ui.mockStatus]);

  const restoreAfterSaveFailure = useCallback(() => {
    const previousSession: Session = {
      sessionId,
      status: finalNote ? "completed" : "in_progress",
      context,
      records,
      finalNote,
      updatedAt: new Date().toISOString(),
      lang,
    };
    restoreSession(previousSession);
    updateAnswer(answer);
    setLastClarificationFeedback(lastClarificationFeedback);
  }, [sessionId, finalNote, context, records, lang, restoreSession, updateAnswer, answer, setLastClarificationFeedback, lastClarificationFeedback]);

  // Skip clarification handler
  const handleSkipClarification = useCallback(async () => {
    if (!lastClarificationFeedback || isPersistingSessionAction) return;
    setIsPersistingSessionAction(true);
    const adv = skipClarification(answer, currentQuestion, stage.title);
    if (!adv) {
      setIsPersistingSessionAction(false);
      return;
    }
    const note = adv.completed && !finalNote
      ? buildSessionSummary(context, adv.nextRecords, lang)
      : finalNote;
    try {
      await saveSessionSnapshot(adv.nextRecords, note);
      if (adv.completed && !finalNote) {
        session.setFinalNote(note);
      }
    } catch (error) {
      restoreAfterSaveFailure();
      const message = error instanceof Error
        ? error.message
        : lang === "en"
          ? "Unable to save this step"
          : "Не удалось сохранить этот шаг";
      setAnswerQualityWarning(message);
      setProviderStatus(message);
    } finally {
      setIsPersistingSessionAction(false);
    }
  }, [lastClarificationFeedback, isPersistingSessionAction, skipClarification, answer, currentQuestion, stage.title, finalNote, context, lang, session, saveSessionSnapshot, restoreAfterSaveFailure, setAnswerQualityWarning, setProviderStatus]);

  const handleNeedClarification = useCallback(async () => {
    if (lastClarificationFeedback || isPersistingSessionAction) return;
    setIsPersistingSessionAction(true);
    const result = addClarificationRequest(currentQuestion, stage.title);
    try {
      await saveSessionSnapshot(result.nextRecords, answer);
      setAnswerQualityWarning(null);
      setSuppressClarifyForNextStage(false);
    } catch (error) {
      setRecords(records);
      setLastClarificationFeedback(null);
      const message = error instanceof Error
        ? error.message
        : lang === "en"
          ? "Unable to save this request"
          : "Не удалось сохранить этот запрос";
      setAnswerQualityWarning(message);
      setProviderStatus(message);
    } finally {
      setIsPersistingSessionAction(false);
    }
  }, [lastClarificationFeedback, isPersistingSessionAction, addClarificationRequest, answer, currentQuestion, stage.title, saveSessionSnapshot, setAnswerQualityWarning, setSuppressClarifyForNextStage, setRecords, records, setLastClarificationFeedback, lang, setProviderStatus]);

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

  const handleGoBack = useCallback(async () => {
    if (isPersistingSessionAction) return;
    const result = goBackOneStep();
    if (result) {
      setIsPersistingSessionAction(true);
      try {
        await saveSessionSnapshot(result.nextRecords, "");
      } catch (error) {
        restoreAfterSaveFailure();
        const message = error instanceof Error
          ? error.message
          : lang === "en"
            ? "Unable to save this change"
            : "Не удалось сохранить это изменение";
        setAnswerQualityWarning(message);
        setProviderStatus(message);
        return;
      } finally {
        setIsPersistingSessionAction(false);
      }
    }
    setAnswerQualityWarning(null);
    setSuppressClarifyForNextStage(false);
  }, [isPersistingSessionAction, goBackOneStep, saveSessionSnapshot, restoreAfterSaveFailure, lang, setAnswerQualityWarning, setProviderStatus, setSuppressClarifyForNextStage]);

  // Start new session after history review
  const handleStartNew = useCallback(() => {
    if (independentSessionStorageKey) {
      sessionManager.clearLocalSession(independentSessionStorageKey);
    }
    resetSession();
    setShowHistory(false);
  }, [independentSessionStorageKey, resetSession]);

  // Handle form submit
  const handleSubmit = useCallback(async () => {
    const result = await submitAnswer(answer, suppressClarifyForNextStage);
    if (result.clarificationNeeded && result.clarifyFeedback) {
      setLastClarificationFeedback(result.clarifyFeedback);
    }
    if (result.success) {
      replaceStudentSessionRoute(sessionId);
    }
  }, [submitAnswer, answer, suppressClarifyForNextStage, setLastClarificationFeedback, replaceStudentSessionRoute, sessionId]);

  const personalCopy = lang === "en"
    ? {
        eyebrow: "Personal session",
        title: "Practice self-regulation for yourself",
        intro: "Use the same five steps to explore your own situation without accessing student data.",
        noticeTitle: "Personal browser-only session",
        noticeText: "This draft is isolated to your signed-in account in this browser. It is never added to student dashboards or teacher analytics.",
        doneText: "This personal result is saved only in this browser and is not visible in student dashboards or teacher analytics.",
      }
    : {
        eyebrow: "\u041b\u0438\u0447\u043d\u0430\u044f \u0441\u0435\u0441\u0441\u0438\u044f",
        title: "\u041f\u0440\u043e\u0439\u0434\u0438\u0442\u0435 \u0441\u0435\u0441\u0441\u0438\u044e \u0441\u0430\u043c\u043e\u0440\u0435\u0433\u0443\u043b\u044f\u0446\u0438\u0438 \u0434\u043b\u044f \u0441\u0435\u0431\u044f",
        intro: "\u0418\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0439\u0442\u0435 \u0442\u0435 \u0436\u0435 \u043f\u044f\u0442\u044c \u0448\u0430\u0433\u043e\u0432 \u0434\u043b\u044f \u0441\u0432\u043e\u0435\u0439 \u0441\u0438\u0442\u0443\u0430\u0446\u0438\u0438, \u043d\u0435 \u043e\u0442\u043a\u0440\u044b\u0432\u0430\u044f \u0434\u0430\u043d\u043d\u044b\u0435 \u0443\u0447\u0435\u043d\u0438\u043a\u043e\u0432.",
        noticeTitle: "\u041b\u0438\u0447\u043d\u0430\u044f \u0441\u0435\u0441\u0441\u0438\u044f \u0432 \u044d\u0442\u043e\u043c \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435",
        noticeText: "\u0427\u0435\u0440\u043d\u043e\u0432\u0438\u043a \u0438\u0437\u043e\u043b\u0438\u0440\u043e\u0432\u0430\u043d \u0434\u043b\u044f \u0432\u0430\u0448\u0435\u0433\u043e \u0430\u043a\u043a\u0430\u0443\u043d\u0442\u0430 \u0432 \u044d\u0442\u043e\u043c \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435. \u041e\u043d \u043d\u0435 \u043f\u043e\u043f\u0430\u0434\u0430\u0435\u0442 \u0432 \u043a\u0430\u0431\u0438\u043d\u0435\u0442\u044b \u0443\u0447\u0435\u043d\u0438\u043a\u043e\u0432 \u0438 \u043f\u0435\u0434\u0430\u0433\u043e\u0433\u0438\u0447\u0435\u0441\u043a\u0443\u044e \u0430\u043d\u0430\u043b\u0438\u0442\u0438\u043a\u0443.",
        doneText: "\u042d\u0442\u043e\u0442 \u043b\u0438\u0447\u043d\u044b\u0439 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u0441\u043e\u0445\u0440\u0430\u043d\u044f\u0435\u0442\u0441\u044f \u0442\u043e\u043b\u044c\u043a\u043e \u0432 \u044d\u0442\u043e\u043c \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435 \u0438 \u043d\u0435 \u0432\u0438\u0434\u0435\u043d \u0432 \u043a\u0430\u0431\u0438\u043d\u0435\u0442\u0430\u0445 \u0443\u0447\u0435\u043d\u0438\u043a\u043e\u0432 \u0438 \u043f\u0435\u0434\u0430\u0433\u043e\u0433\u0438\u0447\u0435\u0441\u043a\u043e\u0439 \u0430\u043d\u0430\u043b\u0438\u0442\u0438\u043a\u0435.",
      };
  const showPersonalHeader = effectiveAccessState === "ready" && isIndependentSession && hasSessionAccess;
  const headerEyebrow = showPersonalHeader ? personalCopy.eyebrow : ui.eyebrow;
  const headerTitle = showPersonalHeader ? personalCopy.title : ui.title;
  const headerIntro = showPersonalHeader ? personalCopy.intro : ui.intro;
  const isTeacherAccount = authUser?.role === "teacher";
  const accountHref = withLang(isTeacherAccount ? "/teacher" : "/student/dashboard", lang);
  const accountLabel = isTeacherAccount ? ui.teacher : ui.dashboard;

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
          <p className="eyebrow">{headerEyebrow}</p>
          <h1>{headerTitle}</h1>
          <p className="muted">{headerIntro}</p>
        </div>
        <div className="action-row">
          <AuthButton lang={lang} />
          <LanguageToggle />
          <Link className="button secondary" href={withLang("/", lang)}>{ui.home}</Link>
          <Link className="button secondary" href={accountHref}>{accountLabel}</Link>
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
              {providerStatus && <span className="muted small-text">{providerStatus}</span>}
            </div>
          </div>

          {effectiveAccessState !== "ready" && (
            <StudentAccessGate
              lang={lang}
              state={effectiveAccessState}
              isAcceptingConsent={isAcceptingConsent}
              onAcceptConsent={handleAcceptConsent}
            />
          )}

          {effectiveAccessState === "ready" && isIndependentSession && (
            <section className="panel mb-16" role="status">
              <h3 className="mt-0">{personalCopy.noticeTitle}</h3>
              <p className="muted mb-0">{personalCopy.noticeText}</p>
            </section>
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
          {effectiveAccessState === "ready" && hasSessionAccess && pastSessions.length > 0 && showHistory && (
            <HistoryReviewPanel
              ui={ui}
              pastSessions={pastSessions}
              onStartNew={handleStartNew}
              lang={lang}
            />
          )}

          {/* Main session content */}
          {effectiveAccessState === "ready" && hasSessionAccess && (!showHistory || pastSessions.length === 0) && (
            <>
              <label className="field">
                <span>{ui.context}</span>
                <input
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder={ui.contextPlaceholder}
                  aria-describedby="session-context-hint"
                />
                <span id="session-context-hint" className="muted fs-13">
                  {ui.contextHint}
                </span>
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
                  currentChildId={currentChildId}
                  sessionId={sessionId}
                  isLinkedToTeacher={isLinkedToTeacher}
                  isIndependentSession={isIndependentSession}
                  personalDoneText={personalCopy.doneText}
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
                  isPersistingSessionAction={isPersistingSessionAction}
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
    dashboard: lang === "en" ? "Dashboard" : "Личный кабинет",
    teacher: lang === "en" ? "Teacher dashboard" : "Кабинет педагога",
    provider: lang === "en" ? "AI provider" : "ИИ-провайдер",
    model: lang === "en" ? "Model" : "Модель",
    key: lang === "en" ? "One-time API key" : "API-ключ",
    keyPlaceholder: lang === "en" ? "Not needed for mock" : "Для mock не нужен",
    context: lang === "en" ? "Context" : "Контекст",
    contextPlaceholder: lang === "en" ? "e.g.: exam, project" : "например: экзамен, проект",
    contextHint: lang === "en" ? "“Study project” is a starting example, not saved personal context. Replace it with your own situation." : "«Учебный проект» — стартовый пример, а не сохранённый личный контекст. Замените его своей ситуацией.",
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
  ui, finalNote, onRestart, lang, currentChildId, sessionId, isLinkedToTeacher, isIndependentSession, personalDoneText, feedbackSubmitted, onFeedbackSubmitted
}: {
  ui: ReturnType<typeof useUiText>;
  finalNote: string;
  onRestart: () => void;
  lang: AppLang;
  currentChildId: string | null;
  sessionId: string;
  isLinkedToTeacher: boolean;
  isIndependentSession: boolean;
  personalDoneText: string;
  feedbackSubmitted: boolean;
  onFeedbackSubmitted: () => void;
}) {
  const effectiveChildId = isIndependentSession ? null : currentChildId;

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
      {isIndependentSession ? (
        <p className="muted fs-13 mt-12">{personalDoneText}</p>
      ) : effectiveChildId ? (
        <p className="muted fs-13 mt-12">
          {isLinkedToTeacher
            ? (lang === "en" ? "Results are saved in your dashboard and available to the linked teacher." : "Результаты сохранены в кабинете и доступны привязанному педагогу.")
            : (lang === "en" ? "Results are saved in your personal dashboard." : "Результаты сохранены в личном кабинете.")}
        </p>
      ) : (
        <p className="muted fs-13 mt-12">{lang === "en" ? "You can start over anytime." : "Можно начать заново в любое время."}</p>
      )}
      {!feedbackSubmitted && effectiveChildId && isLinkedToTeacher && (
        <AdolescentFeedbackForm
          lang={lang}
          childIdFromUrl={null}
          currentChildId={currentChildId}
          sessionId={sessionId}
          onSubmitted={onFeedbackSubmitted}
        />
      )}
      {feedbackSubmitted && <p className="fs-13 c-accent mt-8">{lang === "en" ? "Feedback saved." : "Обратная связь сохранена."}</p>}
    </div>
  );
}

function SessionForm({
  ui, currentQuestion, answer, updateAnswer, lastClarificationFeedback, lang, provider, isSending,
  isPersistingSessionAction, answerQualityWarning, safetyNotice, onSafetyNoticeClear, justClearedClarify, onClearAndRetry, onSkip, onSubmit, onRestart,
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
  isPersistingSessionAction: boolean;
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
          isPersisting={isPersistingSessionAction}
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
          <button className="button secondary" type="button" onClick={onNeedClarification} disabled={isSending || isPersistingSessionAction || Boolean(lastClarificationFeedback)}>
            💬 {ui.clarifyBtn}
          </button>
          <button className="button secondary" type="button" onClick={onGoBack} disabled={isSending || isPersistingSessionAction || !canGoBack}>
            ← {ui.backBtn}
          </button>
        </div>
        
        {/* Primary action */}
        <button className="button" type="button" onClick={onSubmit} disabled={isSending || isPersistingSessionAction} aria-busy={isSending || isPersistingSessionAction} style={{ flex: 1, maxWidth: 200 }}>
          {isSending ? ui.sending : ui.submit}
        </button>
        
        {/* Restart on the right */}
        <button className="button secondary" type="button" onClick={onRestart} disabled={isSending || isPersistingSessionAction}>{ui.restart}</button>
      </div>
    </>
  );
}

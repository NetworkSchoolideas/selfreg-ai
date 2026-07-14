"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";
import { LanguageToggle } from "@/app/components/LanguageToggle";
import { ConfirmDialog } from "@/app/components/ConfirmDialog";
import { normalizeAppLang, withLang } from "@/lib/app-i18n";
import { DataService } from "@/lib/data-service";
import { supabase } from "@/lib/supabase-auth";
import {
  getEffectiveSessionStatus,
  getStudentDashboardMetrics,
  getStudentDashboardStatus,
  isSessionArchivedForStudent,
} from "@/lib/student-dashboard";
import type { ChildProfile, Session } from "@/types/session";

function StudentDashboardContent() {
  const searchParams = useSearchParams();
  const childId = searchParams.get("childId");
  const lang = normalizeAppLang(searchParams.get("lang"));
  const missingChildIdError = lang === "en" ? "Student ID not provided" : "ID ученика не указан";

  const [profile, setProfile] = useState<ChildProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teacherCodeInput, setTeacherCodeInput] = useState("");
  const [isLinkingTeacher, setIsLinkingTeacher] = useState(false);
  const [teacherLinkError, setTeacherLinkError] = useState<string | null>(null);
  const [teacherLinkMessage, setTeacherLinkMessage] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [archiveCandidateId, setArchiveCandidateId] = useState<string | null>(null);
  const [sessionSaveError, setSessionSaveError] = useState<string | null>(null);

  const ui = {
    ru: {
      title: "Личный кабинет",
      loading: "Загрузка...",
      errorTitle: "Ошибка",
      errorNotFound: "Профиль не найден. Возможно, сессии ещё не сохранены локально.",
      errorConnection: "Ошибка загрузки профиля",
      backToSession: "Вернуться к сессии",
      newSession: "Новая сессия",
      continueSession: "Продолжить",
      openSession: "Открыть",
      closeDetails: "Закрыть",
      sessionDetails: "Детали сессии",
      answers: "Ответы",
      aiInsight: "Рекомендация ИИ",
      aiInsightMissing: "Рекомендация еще не создана. Откройте рабочий экран, подключите провайдера и получите комментарий перед новой сессией.",
      getAiInsight: "Получить рекомендацию",
      stepsCount: "шагов",
      abandonedLabel: "Устарела",
      draftLabel: "Черновик",
      hideSession: "Скрыть",
      hideSessionTitle: "Скрыть сессию",
      hideSessionMessage: "Сессия исчезнет из вашего списка, но останется доступна педагогу.",
      hideSessionConfirm: "Скрыть",
      cancel: "Отмена",
      home: "На главную",
      totalSessions: "Всего сессий",
      completed: "Завершено",
      inProgress: "В процессе",
      profile: "Профиль",
      fio: "ФИО",
      class: "Класс",
      registrationDate: "Дата регистрации",
      linkedToTeacher: "Привязан к учителю",
      connectedToSystem: "Подключён к системе обучения",
      sessionHistory: "История сессий",
      noSessions: "У вас пока нет сессий",
      startHint: "Начните обучение, обратившись к учителю",
      sessionLabel: "Сессия",
      completedLabel: "Завершена",
      inProgressLabel: "В процессе",
      currentStatus: "Текущий статус",
      latestActivity: "Последняя активность",
      nextStep: "Следующий шаг",
      nextStepReady: "Запустить новую сессию и пройти цикл до конца.",
      nextStepInProgress: "Вернуться к текущей работе и завершить начатую сессию.",
      nextStepCompleted: "Когда появится новый запрос или ситуация, начните следующий цикл.",
      teacherConnection: "Связь с педагогом",
      teacherConnected: "Активна",
      teacherMissing: "Не настроена",
      teacherCodeLabel: "\u041a\u043e\u0434 \u043f\u0435\u0434\u0430\u0433\u043e\u0433\u0430",
      teacherCodePlaceholder: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043a\u043e\u0434 \u043f\u0435\u0434\u0430\u0433\u043e\u0433\u0430",
      teacherCodeHint: "\u0423\u0447\u0435\u043d\u0438\u043a \u043c\u043e\u0436\u0435\u0442 \u043f\u0440\u0438\u0432\u044f\u0437\u0430\u0442\u044c \u0441\u0432\u043e\u0439 \u043a\u0430\u0431\u0438\u043d\u0435\u0442 \u043a \u043f\u0435\u0434\u0430\u0433\u043e\u0433\u0443 \u043f\u043e \u043a\u043e\u0434\u0443.",
      connectTeacher: "\u041f\u043e\u0434\u043a\u043b\u044e\u0447\u0438\u0442\u044c",
      connectingTeacher: "\u041f\u043e\u0434\u043a\u043b\u044e\u0447\u0430\u0435\u043c...",
      teacherCodeRequired: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043a\u043e\u0434 \u043f\u0435\u0434\u0430\u0433\u043e\u0433\u0430",
      teacherLinkSuccess: "\u0421\u0432\u044f\u0437\u044c \u0441 \u043f\u0435\u0434\u0430\u0433\u043e\u0433\u043e\u043c \u043d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0430.",
      teacherLinkError: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0438\u0442\u044c \u043f\u0435\u0434\u0430\u0433\u043e\u0433\u0430",
      sessionSaveError: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u0435. \u0421\u0435\u0441\u0441\u0438\u044f \u043e\u0441\u0442\u0430\u043b\u0430\u0441\u044c \u0432 \u0441\u043f\u0438\u0441\u043a\u0435 \u2014 \u043f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.",
    },
    en: {
      title: "Dashboard",
      loading: "Loading...",
      errorTitle: "Error",
      errorNotFound: "Profile not found. Sessions may not be saved locally yet.",
      errorConnection: "Failed to load profile",
      backToSession: "Back to session",
      newSession: "New session",
      continueSession: "Continue",
      openSession: "Open",
      closeDetails: "Close",
      sessionDetails: "Session details",
      answers: "Answers",
      aiInsight: "AI recommendation",
      aiInsightMissing: "No recommendation has been created yet. Open the working screen, connect a provider, and generate a comment before the next session.",
      getAiInsight: "Get recommendation",
      stepsCount: "steps",
      abandonedLabel: "Abandoned",
      draftLabel: "Draft",
      hideSession: "Hide",
      hideSessionTitle: "Hide session",
      hideSessionMessage: "The session will disappear from your list, but your teacher will still be able to see it.",
      hideSessionConfirm: "Hide",
      cancel: "Cancel",
      home: "Home",
      totalSessions: "Total sessions",
      completed: "Completed",
      inProgress: "In progress",
      profile: "Profile",
      fio: "Full name",
      class: "Class",
      registrationDate: "Registration date",
      linkedToTeacher: "Linked to teacher",
      connectedToSystem: "Connected to learning system",
      sessionHistory: "Session history",
      noSessions: "No sessions yet",
      startHint: "Start by contacting your teacher",
      sessionLabel: "Session",
      completedLabel: "Completed",
      inProgressLabel: "In progress",
      currentStatus: "Current status",
      latestActivity: "Latest activity",
      nextStep: "Next step",
      nextStepReady: "Start a new session and complete the cycle.",
      nextStepInProgress: "Return to the current work and finish the active session.",
      nextStepCompleted: "When a new situation appears, start the next cycle.",
      teacherConnection: "Teacher connection",
      teacherConnected: "Active",
      teacherMissing: "Not configured",
      teacherCodeLabel: "Teacher code",
      teacherCodePlaceholder: "Enter teacher code",
      teacherCodeHint: "Use the code from your teacher to connect this dashboard.",
      connectTeacher: "Connect",
      connectingTeacher: "Connecting...",
      teacherCodeRequired: "Enter a teacher code",
      teacherLinkSuccess: "Teacher connection is active.",
      teacherLinkError: "Failed to connect teacher",
      sessionSaveError: "Could not save this change. The session remains in your list — please try again.",
    },
  };

  const t = ui[lang];

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        setLoading(true);

        if (!childId) {
          const {
            data: { session },
          } = await supabase?.auth.getSession() ?? { data: { session: null } };
          const user = session?.user ?? null;

          if (!user) {
            if (active) {
              setError(missingChildIdError);
            }
            return;
          }

          const response = await fetch("/api/children?childId=current", { cache: "no-store" });
          const payload = response.ok ? await response.json() : null;
          const currentChild = payload?.child as ChildProfile | null | undefined;

          if (currentChild && active) {
            setProfile(currentChild);
            setError(null);
            return;
          }

          if (active) {
            setError(missingChildIdError);
          }
          return;
        }

        const child = await DataService.getChild(childId);
        if (child && active) {
          setProfile(child);
          setError(null);
          return;
        }

        if (active) {
          setError(t.errorNotFound);
        }
      } catch {
        if (active) {
          setError(t.errorConnection);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      active = false;
    };
  }, [childId, missingChildIdError, t.errorConnection, t.errorNotFound]);

  const metrics = useMemo(() => (profile ? getStudentDashboardMetrics(profile) : null), [profile]);
  const status = useMemo(() => {
    if (!profile || !metrics) {
      return null;
    }

    return getStudentDashboardStatus(profile, metrics, lang);
  }, [lang, metrics, profile]);

  const handleJoinTeacher = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!profile) {
      return;
    }

    const teacherCode = teacherCodeInput.trim();
    setTeacherLinkError(null);
    setTeacherLinkMessage(null);

    if (!teacherCode) {
      setTeacherLinkError(t.teacherCodeRequired);
      return;
    }

    setIsLinkingTeacher(true);

    try {
      const response = await fetch("/api/join-teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherCode, childId: profile.id }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || t.teacherLinkError);
      }

      setProfile((currentProfile) =>
        currentProfile
          ? {
              ...currentProfile,
              teacherId: payload.teacherId || currentProfile.teacherId,
            }
          : currentProfile
      );
      setTeacherCodeInput("");
      setTeacherLinkMessage(t.teacherLinkSuccess);
    } catch (joinError) {
      setTeacherLinkError(joinError instanceof Error ? joinError.message : t.teacherLinkError);
    } finally {
      setIsLinkingTeacher(false);
    }
  };

  if (loading) {
    return (
      <div className="centered-message" style={{ background: "#f3f4f6" }}>
        <div className="c-muted fs-20">{t.loading}</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="centered-message" style={{ background: "#f3f4f6", padding: 20 }}>
        <div className="bg-white p-32 br-12 text-center" style={{ maxWidth: 500, width: "100%", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h2 className="fs-20 mb-16" style={{ color: "#dc2626" }}>{t.errorTitle}</h2>
          <p className="c-muted mb-24">{error || t.errorNotFound}</p>
          <Link
            href={childId ? `/adolescent?childId=${childId}&lang=${lang}` : withLang("/", lang)}
            className="no-underline fw-500"
            style={{
              padding: "12px 24px",
              background: "#4f46e5",
              color: "white",
              borderRadius: 8,
            }}
          >
            {childId ? t.backToSession : t.home}
          </Link>
        </div>
      </div>
    );
  }

  const displayName = profile.realData?.fio || profile.name || (lang === "en" ? "Student" : "Ученик");
  const displayClass = profile.realData?.klass || "";
  const effectiveChildId = childId || profile.id;
  const sortedSessions = metrics
    ? profile.sessions
        .filter((session) => !isSessionArchivedForStudent(session))
        .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    : [];
  const archiveCandidate = archiveCandidateId
    ? profile.sessions.find((session) => getSessionKey(session) === archiveCandidateId) ?? null
    : null;
  const nextStepText =
    metrics && metrics.inProgressSessions.length > 0
      ? t.nextStepInProgress
      : metrics && metrics.completedSessions.length > 0
        ? t.nextStepCompleted
        : t.nextStepReady;
  const statusToneStyles = {
    neutral: { background: "#eff6ff", border: "#bfdbfe", accent: "#1d4ed8" },
    progress: { background: "#ecfdf5", border: "#bbf7d0", accent: "#047857" },
    active: { background: "#fff7ed", border: "#fed7aa", accent: "#c2410c" },
  } as const;
  const statusTone = status ? statusToneStyles[status.tone] : statusToneStyles.neutral;
  const selectedSession = selectedSessionId
    ? sortedSessions.find((session) => getSessionKey(session) === selectedSessionId) ?? null
    : null;
  const newSessionHref = `/adolescent?childId=${effectiveChildId}&mode=new&lang=${lang}`;
  const missingInsightText = lang === "en"
    ? "No recommendation is available for this session."
    : "Для этой сессии пока нет рекомендации.";

  const handleConfirmArchiveSession = async () => {
    if (!archiveCandidate) {
      setArchiveCandidateId(null);
      return;
    }

    const archivedSession: Session = {
      ...archiveCandidate,
      studentArchivedAt: archiveCandidate.studentArchivedAt || new Date().toISOString(),
    };

    setSessionSaveError(null);

    setProfile((currentProfile) => {
      if (!currentProfile) return currentProfile;

      return {
        ...currentProfile,
        sessions: currentProfile.sessions.map((session) =>
          getSessionKey(session) === getSessionKey(archiveCandidate) ? archivedSession : session
        ),
      };
    });
    setSelectedSessionId((current) => (current === getSessionKey(archiveCandidate) ? null : current));
    setArchiveCandidateId(null);

    try {
      await DataService.saveSession(profile.id, archivedSession);
    } catch {
      setProfile((currentProfile) =>
        currentProfile
          ? {
              ...currentProfile,
              sessions: currentProfile.sessions.map((session) =>
                getSessionKey(session) === getSessionKey(archiveCandidate) ? archiveCandidate : session
              ),
            }
          : currentProfile
      );
      setSessionSaveError(t.sessionSaveError);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", padding: 20 }}>
      <ConfirmDialog
        isOpen={Boolean(archiveCandidate)}
        title={t.hideSessionTitle}
        message={t.hideSessionMessage}
        confirmLabel={t.hideSessionConfirm}
        cancelLabel={t.cancel}
        tone="neutral"
        onConfirm={handleConfirmArchiveSession}
        onCancel={() => setArchiveCandidateId(null)}
      />
      <div className="content-container-wide">
        <header className="section-header">
          <div className="flex-row justify-between items-start">
            <div>
              <h1 className="fs-28 mb-8">{t.title}</h1>
              <p className="c-muted">
                {displayName}{displayClass ? `, ${displayClass}` : ""}
              </p>
            </div>
            <LanguageToggle />
          </div>
        </header>

        {sessionSaveError && (
          <p role="alert" className="mb-16" style={{ color: "#b91c1c" }}>
            {sessionSaveError}
          </p>
        )}

        <div className="action-bar">
          <Link
            href={newSessionHref}
            className="no-underline fw-500"
            style={{
              padding: "12px 24px",
              background: "#4f46e5",
              color: "white",
              borderRadius: 8,
            }}
          >
            {t.newSession}
          </Link>
          <Link
            href={withLang("/", lang)}
            className="no-underline fw-500"
            style={{
              padding: "12px 24px",
              background: "#6b7280",
              color: "white",
              borderRadius: 8,
            }}
          >
            {t.home}
          </Link>
        </div>

        <div className="stat-grid-3col">
          <div className="stat-card" style={{ padding: 24, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div className="fs-14 c-muted mb-8">{t.totalSessions}</div>
            <div className="fs-36 fw-700">{metrics?.totalSessions ?? 0}</div>
          </div>
          <div className="stat-card" style={{ padding: 24, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div className="fs-14 c-muted mb-8">{t.completed}</div>
            <div className="fs-36 fw-700" style={{ color: "#10b981" }}>{metrics?.completedSessions.length ?? 0}</div>
          </div>
          <div className="stat-card" style={{ padding: 24, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div className="fs-14 c-muted mb-8">{t.inProgress}</div>
            <div className="fs-36 fw-700" style={{ color: "#f59e0b" }}>{metrics?.inProgressSessions.length ?? 0}</div>
          </div>
        </div>

        <div className="flex-col gap-24">
          {status && (
            <div
              className="bg-white br-12 p-24"
              style={{
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                background: statusTone.background,
                border: `1px solid ${statusTone.border}`,
              }}
            >
              <div className="flex-row justify-between items-start" style={{ gap: 16, flexWrap: "wrap" }}>
                <div style={{ maxWidth: 680 }}>
                  <div className="fs-14 fw-600 mb-8" style={{ color: statusTone.accent }}>
                    {t.currentStatus}
                  </div>
                  <h2 className="fs-22 mb-8">{status.title}</h2>
                  <p className="c-muted" style={{ margin: 0 }}>{status.description}</p>
                </div>
                <div style={{ minWidth: 220, display: "grid", gap: 12 }}>
                  <div className="profile-field" style={{ background: "rgba(255,255,255,0.72)" }}>
                    <div className="fs-13 c-muted mb-4">{t.latestActivity}</div>
                    <div className="fs-15 fw-500">
                      {metrics?.latestSession
                        ? new Date(metrics.latestSession.updatedAt).toLocaleString(lang === "en" ? "en-US" : "ru-RU")
                        : "-"}
                    </div>
                  </div>
                  <div className="profile-field" style={{ background: "rgba(255,255,255,0.72)" }}>
                    <div className="fs-13 c-muted mb-4">{t.teacherConnection}</div>
                    <div className="fs-15 fw-500">{profile.teacherId ? t.teacherConnected : t.teacherMissing}</div>
                  </div>
                  <div className="profile-field" style={{ background: "rgba(255,255,255,0.72)" }}>
                    <div className="fs-13 c-muted mb-4">{t.nextStep}</div>
                    <div className="fs-15 fw-500">{nextStepText}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white br-12 p-24" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h2 className="fs-20 mb-16">{t.profile}</h2>

            <div className="flex-col gap-16">
              <div className="profile-field">
                <div className="fs-14 c-muted mb-4">{t.fio}</div>
                <div className="fs-18 fw-500">{displayName}</div>
              </div>

              {displayClass && (
                <div className="profile-field">
                  <div className="fs-14 c-muted mb-4">{t.class}</div>
                  <div className="fs-18 fw-500">{displayClass}</div>
                </div>
              )}

              <div className="profile-field">
                <div className="fs-14 c-muted mb-4">{t.registrationDate}</div>
                <div className="fs-18 fw-500">
                  {new Date(profile.createdAt).toLocaleDateString(lang === "en" ? "en-US" : "ru-RU")}
                </div>
              </div>

              {profile.teacherId ? (
                <div className="profile-field" style={{ background: "#ecfdf5", border: "1px solid #10b981" }}>
                  <div className="fs-14 mb-4" style={{ color: "#065f46" }}>
                    {t.linkedToTeacher}
                  </div>
                  <div className="fs-14" style={{ color: "#047857" }}>
                    ✓ {t.connectedToSystem}
                  </div>
                </div>
              ) : (
                <form
                  className="profile-field"
                  onSubmit={handleJoinTeacher}
                  style={{ background: "#f8fafc", border: "1px solid #dbe4ef" }}
                >
                  <label className="fs-14 c-muted mb-8" htmlFor="teacher-code-input" style={{ display: "block" }}>
                    {t.teacherCodeLabel}
                  </label>
                  <div className="flex-row gap-8" style={{ alignItems: "stretch", flexWrap: "wrap" }}>
                    <input
                      id="teacher-code-input"
                      type="text"
                      value={teacherCodeInput}
                      onChange={(event) => setTeacherCodeInput(event.target.value)}
                      placeholder={t.teacherCodePlaceholder}
                      className="form-input"
                      style={{ minWidth: 220, flex: "1 1 220px" }}
                      autoComplete="off"
                    />
                    <button
                      type="submit"
                      className="button"
                      disabled={isLinkingTeacher}
                      style={{ padding: "10px 16px", minHeight: 42 }}
                    >
                      {isLinkingTeacher ? t.connectingTeacher : t.connectTeacher}
                    </button>
                  </div>
                  <div className="fs-13 c-muted mt-8">{t.teacherCodeHint}</div>
                  {teacherLinkError && (
                    <div className="fs-13 mt-8" style={{ color: "#b91c1c" }}>
                      {teacherLinkError}
                    </div>
                  )}
                  {teacherLinkMessage && (
                    <div className="fs-13 mt-8" style={{ color: "#047857" }}>
                      {teacherLinkMessage}
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>

          <div className="bg-white br-12 p-24" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h2 className="fs-20 mb-16">{t.sessionHistory}</h2>

            {(metrics?.totalSessions ?? 0) === 0 && (
              <div className="text-center c-muted" style={{ padding: 40 }}>
                <p>{t.noSessions}</p>
                <p className="fs-14 mt-8">{t.startHint}</p>
              </div>
            )}

            {(metrics?.totalSessions ?? 0) > 0 && (
              <div className="flex-col gap-16">
                {sortedSessions.map((session) => {
                  const effectiveStatus = getEffectiveSessionStatus(session);
                  const isCompleted = effectiveStatus === "completed";
                  const isInProgress = effectiveStatus === "in_progress";
                  const statusLabel =
                    effectiveStatus === "completed"
                      ? t.completedLabel
                      : effectiveStatus === "in_progress"
                        ? t.inProgressLabel
                        : effectiveStatus === "abandoned"
                          ? t.abandonedLabel
                          : t.draftLabel;
                  const statusColors =
                    effectiveStatus === "completed"
                      ? { background: "#d1fae5", color: "#065f46" }
                      : effectiveStatus === "in_progress"
                        ? { background: "#fef3c7", color: "#92400e" }
                        : effectiveStatus === "abandoned"
                          ? { background: "#fee2e2", color: "#991b1b" }
                          : { background: "#e0f2fe", color: "#075985" };
                  const sessionKey = getSessionKey(session);
                  const continueHref = session.sessionId
                    ? `/adolescent?childId=${effectiveChildId}&resumeSessionId=${session.sessionId}&lang=${lang}`
                    : newSessionHref;

                  return (
                    <div key={sessionKey} className="profile-field">
                      <div className="flex-row justify-between items-center mb-8">
                        <div className="fs-16 fw-500">{session.context || t.sessionLabel}</div>
                        <span
                          className="br-999 fs-12 fw-500"
                          style={{
                            padding: "4px 12px",
                            background: statusColors.background,
                            color: statusColors.color,
                          }}
                        >
                          {statusLabel}
                        </span>
                      </div>
                      {session.finalNote && (
                        <div className="fs-14 c-muted mb-8">
                          {session.finalNote}
                        </div>
                      )}
                      <div className="fs-12" style={{ color: "#9ca3af" }}>
                        {new Date(session.updatedAt).toLocaleString(lang === "en" ? "en-US" : "ru-RU")}
                        {" · "}
                        {session.records?.length ?? 0} {t.stepsCount}
                      </div>
                      {session.historyInsight && (
                        <div
                          className="mt-12 p-12 br-8 fs-13"
                          style={{
                            background: "#f0fdf4",
                            border: "1px solid #bbf7d0",
                            color: "#166534",
                          }}
                        >
                          💡 {session.historyInsight}
                        </div>
                      )}
                      <div className="flex-row gap-8 mt-12" style={{ flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="button secondary"
                          onClick={() => setSelectedSessionId(sessionKey)}
                          style={{ padding: "8px 12px" }}
                        >
                          {t.openSession}
                        </button>
                        {isInProgress && (
                          <Link
                            href={continueHref}
                            className="button no-underline"
                            style={{ padding: "8px 12px" }}
                          >
                            {t.continueSession}
                          </Link>
                        )}
                        <button
                          type="button"
                          className="button secondary"
                          onClick={() => setArchiveCandidateId(sessionKey)}
                          style={{ padding: "8px 12px" }}
                        >
                          {t.hideSession}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {selectedSession && (
            <div className="bg-white br-12 p-24" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <div className="flex-row justify-between items-start mb-16" style={{ gap: 16 }}>
                <div>
                  <h2 className="fs-20 mb-8">{t.sessionDetails}</h2>
                  <p className="c-muted" style={{ margin: 0 }}>
                    {selectedSession.context || t.sessionLabel}
                  </p>
                </div>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setSelectedSessionId(null)}
                  style={{ padding: "8px 12px" }}
                >
                  {t.closeDetails}
                </button>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setArchiveCandidateId(getSessionKey(selectedSession))}
                  style={{ padding: "8px 12px" }}
                >
                  {t.hideSession}
                </button>
              </div>

              {selectedSession.finalNote && (
                <div className="profile-field mb-16" style={{ background: "#f8fafc" }}>
                  <div className="fs-14 c-muted mb-4">{t.completedLabel}</div>
                  <div className="fs-15">{selectedSession.finalNote}</div>
                </div>
              )}

              <div className="profile-field mb-16" style={{ background: selectedSession.historyInsight ? "#f0fdf4" : "#fff7ed" }}>
                <div className="fs-14 fw-600 mb-6">{t.aiInsight}</div>
                <div className="fs-14 c-muted">
                  {selectedSession.historyInsight || missingInsightText}
                </div>
              </div>

              <h3 className="fs-16 mb-12">{t.answers}</h3>
              <div className="flex-col gap-12">
                {(selectedSession.records ?? []).map((record, index) => (
                  <div key={`${record.stageId}-${record.timestamp}-${index}`} className="profile-field">
                    <div className="fs-13 c-muted mb-4">
                      {record.stageTitle} · {record.scenario}
                    </div>
                    <div className="fs-14 fw-500 mb-6">{record.question}</div>
                    <div className="fs-14 mb-8">{record.answer}</div>
                    <div className="fs-13 c-muted">{record.feedback}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getSessionKey(session: Session): string {
  return session.sessionId || session.updatedAt;
}

export default function StudentDashboardPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        <StudentDashboardContent />
      </Suspense>
    </ErrorBoundary>
  );
}

"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";
import { LanguageToggle } from "@/app/components/LanguageToggle";
import { normalizeAppLang, withLang } from "@/lib/app-i18n";
import { DataService } from "@/lib/data-service";
import { getStudentDashboardMetrics, getStudentDashboardStatus } from "@/lib/student-dashboard";
import type { ChildProfile } from "@/types/session";

function StudentDashboardContent() {
  const searchParams = useSearchParams();
  const childId = searchParams.get("childId");
  const lang = normalizeAppLang(searchParams.get("lang"));
  const missingChildIdError = lang === "en" ? "Student ID not provided" : "ID ученика не указан";

  const [profile, setProfile] = useState<ChildProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ui = {
    ru: {
      title: "Личный кабинет",
      loading: "Загрузка...",
      errorTitle: "Ошибка",
      errorNotFound: "Профиль не найден. Возможно, сессии ещё не сохранены локально.",
      errorConnection: "Ошибка загрузки профиля",
      backToSession: "Вернуться к сессии",
      newSession: "Новая сессия",
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
    },
    en: {
      title: "Dashboard",
      loading: "Loading...",
      errorTitle: "Error",
      errorNotFound: "Profile not found. Sessions may not be saved locally yet.",
      errorConnection: "Failed to load profile",
      backToSession: "Back to session",
      newSession: "New session",
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
    },
  };

  const t = ui[lang];

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        setLoading(true);

        if (!childId) {
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
      } catch (loadError) {
        if (active) {
          setError(t.errorConnection);
        }
        console.error(loadError);
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
    ? [...profile.sessions].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    : [];
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

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", padding: 20 }}>
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

        <div className="action-bar">
          <Link
            href={`/adolescent?childId=${effectiveChildId}&lang=${lang}`}
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

              {profile.teacherId && (
                <div className="profile-field" style={{ background: "#ecfdf5", border: "1px solid #10b981" }}>
                  <div className="fs-14 mb-4" style={{ color: "#065f46" }}>
                    {t.linkedToTeacher}
                  </div>
                  <div className="fs-14" style={{ color: "#047857" }}>
                    ✓ {t.connectedToSystem}
                  </div>
                </div>
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
                  const isCompleted = Boolean(session.finalNote?.trim()) || session.status === "completed";

                  return (
                    <div key={session.sessionId || session.updatedAt} className="profile-field">
                      <div className="flex-row justify-between items-center mb-8">
                        <div className="fs-16 fw-500">{session.context || t.sessionLabel}</div>
                        <span
                          className="br-999 fs-12 fw-500"
                          style={{
                            padding: "4px 12px",
                            background: isCompleted ? "#d1fae5" : "#fef3c7",
                            color: isCompleted ? "#065f46" : "#92400e",
                          }}
                        >
                          {isCompleted ? t.completedLabel : t.inProgressLabel}
                        </span>
                      </div>
                      {session.finalNote && (
                        <div className="fs-14 c-muted mb-8">
                          {session.finalNote}
                        </div>
                      )}
                      <div className="fs-12" style={{ color: "#9ca3af" }}>
                        {new Date(session.updatedAt).toLocaleString(lang === "en" ? "en-US" : "ru-RU")}
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
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
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

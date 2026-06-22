"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";
import { LanguageToggle } from "@/app/components/LanguageToggle";
import { normalizeAppLang, withLang } from "@/lib/app-i18n";
import { DataService } from "@/lib/data-service";
import type { ChildProfile, Session } from "@/types/session";
import type { AppLang } from "@/lib/app-i18n";

function StudentDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const childId = searchParams.get("childId");
  const lang = normalizeAppLang(searchParams.get("lang"));
  const hasChildId = Boolean(childId);
  const missingChildIdError = lang === "en" ? "Student ID not provided" : "ID ученика не указан";

  const [profile, setProfile] = useState<ChildProfile | null>(null);
  const [loading, setLoading] = useState(hasChildId);
  const [error, setError] = useState<string | null>(hasChildId ? null : missingChildIdError);

  const ui = {
    ru: {
      title: "Личный кабинет",
      loading: "Загрузка...",
      errorTitle: "Ошибка",
      errorNoId: "ID ученика не указан",
      errorNotFound: "Профиль не найден. Возможно, сессии ещё не сохранены локально.",
      errorConnection: "Ошибка загрузки профиля",
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
      comingSoon: "Разделы в разработке",
      progressCharts: "Графики прогресса",
      sessionFeedback: "Обратная связь по сессиям",
      achievements: "Достижения и награды",
      profileSettings: "Настройки профиля",
    },
    en: {
      title: "Dashboard",
      loading: "Loading...",
      errorTitle: "Error",
      errorNoId: "Student ID not provided",
      errorNotFound: "Profile not found. Sessions may not be saved locally yet.",
      errorConnection: "Failed to load profile",
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
      comingSoon: "Coming soon",
      progressCharts: "Progress charts",
      sessionFeedback: "Session feedback",
      achievements: "Achievements",
      profileSettings: "Profile settings",
    },
  };

  const t = ui[lang];

  useEffect(() => {
    let active = true;

    if (!childId) {
      return () => {
        active = false;
      };
    }

    const loadProfile = async () => {
      try {
        setLoading(true);

        // Используем DataService: Supabase → localStorage fallback
        const child = await DataService.getChild(childId);
        if (child && active) {
          setProfile(child);
          setLoading(false);
          return;
        }

        if (active) setError(t.errorNotFound);
      } catch (err) {
        if (active) setError(t.errorConnection);
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, [childId, lang, t.errorConnection, t.errorNotFound]);

  const completedSessions = profile?.sessions.filter((s) => s.status === "completed" || s.finalNote) || [];
  const inProgressSessions = profile?.sessions.filter((s) => s.status === "in_progress" || (!s.finalNote && s.records?.length > 0)) || [];
  const totalSessions = completedSessions.length + inProgressSessions.length;

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
            {childId ? (lang === "en" ? "Back to session" : "Вернуться к сессии") : t.home}
          </Link>
        </div>
      </div>
    );
  }

  const displayName = profile.realData?.fio || profile.name || (lang === "en" ? "Student" : "Ученик");
  const displayClass = profile.realData?.klass || "";

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
            href={`/adolescent?childId=${childId}&lang=${lang}`}
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
            <div className="fs-36 fw-700">{totalSessions}</div>
          </div>
          <div className="stat-card" style={{ padding: 24, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div className="fs-14 c-muted mb-8">{t.completed}</div>
            <div className="fs-36 fw-700" style={{ color: "#10b981" }}>{completedSessions.length}</div>
          </div>
          <div className="stat-card" style={{ padding: 24, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div className="fs-14 c-muted mb-8">{t.inProgress}</div>
            <div className="fs-36 fw-700" style={{ color: "#f59e0b" }}>{inProgressSessions.length}</div>
          </div>
        </div>

        <div className="flex-col gap-24">
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

            {totalSessions === 0 && (
              <div className="text-center c-muted" style={{ padding: 40 }}>
                <p>{t.noSessions}</p>
                <p className="fs-14 mt-8">
                  {t.startHint}
                </p>
              </div>
            )}

            {totalSessions > 0 && (
              <div className="flex-col gap-16">
                {[...profile.sessions]
                  .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                  .map((session) => {
                    const isCompleted = Boolean(session.finalNote?.trim()) || session.status === "completed";
                    return (
                      <div
                        key={session.sessionId || session.updatedAt}
                        className="profile-field"
                      >
                        <div className="flex-row justify-between items-center mb-8">
                          <div className="fs-16 fw-500">{session.context || `${t.sessionLabel}`}</div>
                          <span className="br-999 fs-12 fw-500" style={{
                            padding: "4px 12px",
                            background: isCompleted ? "#d1fae5" : "#fef3c7",
                            color: isCompleted ? "#065f46" : "#92400e",
                          }}>
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
                          <div className="mt-12 p-12 br-8 fs-13" style={{
                            background: "#f0fdf4",
                            border: "1px solid #bbf7d0",
                            color: "#166534",
                          }}>
                            💡 {session.historyInsight}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          <div className="mt-32 p-24 bg-white br-12" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h3 className="fs-18 mb-16">{t.comingSoon}</h3>
            <ul className="c-muted" style={{ paddingLeft: 20 }}>
              <li>{t.progressCharts}</li>
              <li>{t.sessionFeedback}</li>
              <li>{t.achievements}</li>
              <li>{t.profileSettings}</li>
            </ul>
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

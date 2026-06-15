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

  const [profile, setProfile] = useState<ChildProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    const loadProfile = async () => {
      try {
        setLoading(true);

        if (!childId) {
          if (active) setError(t.errorNoId);
          setLoading(false);
          return;
        }

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
  }, [childId, lang]);

  const completedSessions = profile?.sessions.filter((s) => s.status === "completed" || s.finalNote) || [];
  const inProgressSessions = profile?.sessions.filter((s) => s.status === "in_progress" || (!s.finalNote && s.records?.length > 0)) || [];
  const totalSessions = completedSessions.length + inProgressSessions.length;

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f3f4f6",
      }}>
        <div style={{ color: "#6b7280", fontSize: 20 }}>{t.loading}</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f3f4f6",
        padding: 20,
      }}>
        <div style={{
          background: "white",
          padding: 32,
          borderRadius: 12,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          textAlign: "center",
          maxWidth: 500,
          width: "100%",
        }}>
          <h2 style={{ fontSize: 20, marginBottom: 16, color: "#dc2626" }}>{t.errorTitle}</h2>
          <p style={{ color: "#6b7280", marginBottom: 24 }}>{error || t.errorNotFound}</p>
          <Link
            href={`/adolescent?childId=${childId || ""}&lang=${lang}`}
            style={{
              padding: "12px 24px",
              background: "#4f46e5",
              color: "white",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            {lang === "en" ? "Back to session" : "Вернуться к сессии"}
          </Link>
        </div>
      </div>
    );
  }

  const displayName = profile.realData?.fio || profile.name || (lang === "en" ? "Student" : "Ученик");
  const displayClass = profile.realData?.klass || "";

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f3f4f6",
      padding: 20,
    }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <header style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h1 style={{ fontSize: 28, marginBottom: 8 }}>{t.title}</h1>
              <p style={{ color: "#6b7280" }}>
                {displayName}{displayClass ? `, ${displayClass}` : ""}
              </p>
            </div>
            <LanguageToggle />
          </div>
        </header>

        <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
          <Link
            href={`/adolescent?childId=${childId}&lang=${lang}`}
            style={{
              padding: "12px 24px",
              background: "#4f46e5",
              color: "white",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            {t.newSession}
          </Link>
          <Link
            href={withLang("/", lang)}
            style={{
              padding: "12px 24px",
              background: "#6b7280",
              color: "white",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            {t.home}
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 32 }}>
          <div style={{ background: "white", padding: 24, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>{t.totalSessions}</div>
            <div style={{ fontSize: 36, fontWeight: "bold" }}>{totalSessions}</div>
          </div>
          <div style={{ background: "white", padding: 24, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>{t.completed}</div>
            <div style={{ fontSize: 36, fontWeight: "bold", color: "#10b981" }}>{completedSessions.length}</div>
          </div>
          <div style={{ background: "white", padding: 24, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>{t.inProgress}</div>
            <div style={{ fontSize: 36, fontWeight: "bold", color: "#f59e0b" }}>{inProgressSessions.length}</div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 24 }}>
          <div style={{ background: "white", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", padding: 24 }}>
            <h2 style={{ fontSize: 20, marginBottom: 16 }}>{t.profile}</h2>

            <div style={{ display: "grid", gap: 16 }}>
              <div style={{
                padding: 16,
                background: "#f9fafb",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
              }}>
                <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 4 }}>{t.fio}</div>
                <div style={{ fontSize: 18, fontWeight: 500 }}>{displayName}</div>
              </div>

              {displayClass && (
                <div style={{
                  padding: 16,
                  background: "#f9fafb",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                }}>
                  <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 4 }}>{t.class}</div>
                  <div style={{ fontSize: 18, fontWeight: 500 }}>{displayClass}</div>
                </div>
              )}

              <div style={{
                padding: 16,
                background: "#f9fafb",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
              }}>
                <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 4 }}>{t.registrationDate}</div>
                <div style={{ fontSize: 18, fontWeight: 500 }}>
                  {new Date(profile.createdAt).toLocaleDateString(lang === "en" ? "en-US" : "ru-RU")}
                </div>
              </div>

              {profile.teacherId && (
                <div style={{
                  padding: 16,
                  background: "#ecfdf5",
                  borderRadius: 8,
                  border: "1px solid #10b981",
                }}>
                  <div style={{ fontSize: 14, color: "#065f46", marginBottom: 4 }}>
                    {t.linkedToTeacher}
                  </div>
                  <div style={{ fontSize: 14, color: "#047857" }}>
                    ✓ {t.connectedToSystem}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ background: "white", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", padding: 24 }}>
            <h2 style={{ fontSize: 20, marginBottom: 16 }}>{t.sessionHistory}</h2>

            {totalSessions === 0 && (
              <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
                <p>{t.noSessions}</p>
                <p style={{ fontSize: 14, marginTop: 8 }}>
                  {t.startHint}
                </p>
              </div>
            )}

            {totalSessions > 0 && (
              <div style={{ display: "grid", gap: 16 }}>
                {[...profile.sessions]
                  .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                  .map((session) => {
                    const isCompleted = Boolean(session.finalNote?.trim()) || session.status === "completed";
                    return (
                      <div
                        key={session.sessionId || session.updatedAt}
                        style={{
                          padding: 16,
                          background: "#f9fafb",
                          borderRadius: 8,
                          border: "1px solid #e5e7eb",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <div style={{ fontSize: 16, fontWeight: 500 }}>{session.context || `${t.sessionLabel}`}</div>
                          <span style={{
                            padding: "4px 12px",
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 500,
                            background: isCompleted ? "#d1fae5" : "#fef3c7",
                            color: isCompleted ? "#065f46" : "#92400e",
                          }}>
                            {isCompleted ? t.completedLabel : t.inProgressLabel}
                          </span>
                        </div>
                        {session.finalNote && (
                          <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>
                            {session.finalNote}
                          </div>
                        )}
                        <div style={{ fontSize: 12, color: "#9ca3af" }}>
                          {new Date(session.updatedAt).toLocaleString(lang === "en" ? "en-US" : "ru-RU")}
                        </div>
                        {session.historyInsight && (
                          <div style={{
                            marginTop: 12,
                            padding: 12,
                            background: "#f0fdf4",
                            borderRadius: 8,
                            border: "1px solid #bbf7d0",
                            fontSize: 13,
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

          <div style={{ marginTop: 32, padding: 24, background: "white", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h3 style={{ fontSize: 18, marginBottom: 16 }}>{t.comingSoon}</h3>
            <ul style={{ color: "#6b7280", paddingLeft: 20 }}>
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
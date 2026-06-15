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

function ChildDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const childId = searchParams.get("childId");
  const lang = normalizeAppLang(searchParams.get("lang"));

  const [child, setChild] = useState<ChildProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ui = {
    ru: {
      errorNoId: "ID ученика не указан",
      errorNotFound: "Ученик не найден",
      errorConnection: "Ошибка подключения к серверу",
      loading: "Загрузка...",
      backToList: "Назад к списку",
      openSession: "Открыть сессию",
      sessions: "сессий",
      totalSessions: "Всего сессий",
      completed: "Завершено",
      inProgress: "В процессе",
      studentInfo: "Информация об ученике",
      name: "Имя",
      class: "Класс",
      studentId: "ID ученика",
      registrationDate: "Дата регистрации",
      linkedToTeacher: "Привязан к учителю",
      teacherId: "ID учителя",
      sessionHistory: "История сессий",
      noSessions: "У ученика пока нет сессий",
      completedLabel: "Завершена",
      inProgressLabel: "В процессе",
      stages: "этапов",
      summary: "Итог",
      comingSoon: "Скоро",
      progressCharts: "Графики прогресса по этапам",
      sessionComparison: "Сравнение сессий",
      dataExport: "Экспорт данных",
    },
    en: {
      errorNoId: "Student ID not provided",
      errorNotFound: "Student not found",
      errorConnection: "Failed to connect to server",
      loading: "Loading...",
      backToList: "Back to list",
      openSession: "Open session",
      sessions: "sessions",
      totalSessions: "Total sessions",
      completed: "Completed",
      inProgress: "In progress",
      studentInfo: "Student information",
      name: "Name",
      class: "Class",
      studentId: "Student ID",
      registrationDate: "Registration date",
      linkedToTeacher: "Linked to teacher",
      teacherId: "Teacher ID",
      sessionHistory: "Session history",
      noSessions: "No sessions yet",
      completedLabel: "Completed",
      inProgressLabel: "In progress",
      stages: "stages",
      summary: "Summary",
      comingSoon: "Coming soon",
      progressCharts: "Progress charts by stage",
      sessionComparison: "Session comparison",
      dataExport: "Data export",
    },
  };

  const t = ui[lang];

  useEffect(() => {
    if (!childId) return;

    let active = true;

    const loadChild = async () => {
      try {
        setLoading(true);

        // DataService: Supabase (если доступен) → localStorage fallback
        const found = await DataService.getChild(childId);
        if (found) {
          if (active) setChild(found);
          setLoading(false);
          return;
        }

        // Запасной вариант: API (прямой запрос к серверу)
        try {
          const response = await fetch(`/api/children?childId=${encodeURIComponent(childId)}`, {
            cache: "no-store",
          });
          const data = await response.json();

          if (data.ok && data.child) {
            await DataService.saveChild(data.child);
            if (active) setChild(data.child);
            setLoading(false);
            return;
          }
        } catch {
          // API недоступен
        }

        if (active) setError(t.errorNotFound);
      } catch (err) {
        if (active) setError(t.errorConnection);
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadChild();

    return () => {
      active = false;
    };
  }, [childId, lang]);

  if (!childId) {
    return (
      <div className="centered-message" style={{ background: "#f3f4f6", padding: 20 }}>
        <div className="bg-white p-32 br-12 text-center" style={{ maxWidth: 500, width: "100%", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h2 className="fs-20 mb-16" style={{ color: "#dc2626" }}>{lang === "en" ? "Error" : "Ошибка"}</h2>
          <p className="c-muted mb-24">{t.errorNoId}</p>
          <Link
            href={withLang("/teacher", lang)}
            className="no-underline fw-500"
            style={{
              padding: "12px 24px",
              background: "#4f46e5",
              color: "white",
              borderRadius: 8,
            }}
          >
            {t.backToList}
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="centered-message" style={{ background: "#f3f4f6" }}>
        <div className="c-muted fs-20">{t.loading}</div>
      </div>
    );
  }

  if (error || !child) {
    return (
      <div className="centered-message" style={{ background: "#f3f4f6", padding: 20 }}>
        <div className="bg-white p-32 br-12 text-center" style={{ maxWidth: 500, width: "100%", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h2 className="fs-20 mb-16" style={{ color: "#dc2626" }}>{lang === "en" ? "Error" : "Ошибка"}</h2>
          <p className="c-muted mb-24">{error || t.errorNotFound}</p>
          <Link
            href={withLang("/teacher", lang)}
            className="no-underline fw-500"
            style={{
              padding: "12px 24px",
              background: "#4f46e5",
              color: "white",
              borderRadius: 8,
            }}
          >
            {t.backToList}
          </Link>
        </div>
      </div>
    );
  }

  const displayName = child.realData?.fio || child.name || (lang === "en" ? "No name" : "Без имени");
  const displayClass = child.realData?.klass || "";
  const completedSessions = child.sessions.filter((s) => Boolean(s.finalNote?.trim()) || s.status === "completed");
  const inProgressSessions = child.sessions.filter((s) => !s.finalNote?.trim() && s.status !== "completed" && s.records?.length > 0);

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", padding: 20 }}>
      <div className="content-container">
        <header className="section-header">
          <div className="flex-row justify-between items-start">
            <div>
              <h1 className="fs-28 mb-8">{displayName}</h1>
              <p className="c-muted">
                {displayClass ? `${displayClass} · ` : ""}
                {child.sessions.length} {t.sessions}
              </p>
            </div>
            <LanguageToggle />
          </div>
        </header>

        <div className="action-bar">
          <Link
            href={withLang("/teacher", lang)}
            className="no-underline fw-500"
            style={{
              padding: "12px 24px",
              background: "#4f46e5",
              color: "white",
              borderRadius: 8,
            }}
          >
            {t.backToList}
          </Link>
          <Link
            href={`/adolescent?childId=${childId}&lang=${lang}`}
            className="no-underline fw-500"
            style={{
              padding: "12px 24px",
              background: "#10b981",
              color: "white",
              borderRadius: 8,
            }}
          >
            {t.openSession}
          </Link>
        </div>

        {/* Статистика */}
        <div className="stat-grid-3col">
          <div className="stat-card" style={{ padding: 24, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div className="fs-14 c-muted mb-8">{t.totalSessions}</div>
            <div className="fs-36 fw-700">{child.sessions.length}</div>
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

        {/* Информация об ученике */}
        <div className="bg-white br-12 p-24 mb-32" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h2 className="fs-20 mb-16">{t.studentInfo}</h2>

          <div className="flex-col gap-16">
            <div className="profile-field">
              <div className="fs-14 c-muted mb-4">{t.name}</div>
              <div className="fs-18 fw-500">{displayName}</div>
            </div>

            {displayClass && (
              <div className="profile-field">
                <div className="fs-14 c-muted mb-4">{t.class}</div>
                <div className="fs-18 fw-500">{displayClass}</div>
              </div>
            )}

            <div className="profile-field">
              <div className="fs-14 c-muted mb-4">{t.studentId}</div>
              <div className="fs-14" style={{ fontFamily: "monospace", color: "#374151" }}>{child.id}</div>
            </div>

            <div className="profile-field">
              <div className="fs-14 c-muted mb-4">{t.registrationDate}</div>
              <div className="fs-18 fw-500">
                {new Date(child.createdAt).toLocaleDateString(lang === "en" ? "en-US" : "ru-RU")}
              </div>
            </div>

            {child.teacherId && (
              <div className="profile-field" style={{ background: "#ecfdf5", border: "1px solid #10b981" }}>
                <div className="fs-14 mb-4" style={{ color: "#065f46" }}>
                  {t.linkedToTeacher}
                </div>
                <div className="fs-14" style={{ color: "#047857" }}>
                  ✓ {t.teacherId}: {child.teacherId}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* История сессий */}
        <div className="bg-white br-12 p-24 mb-32" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h2 className="fs-20 mb-16">{t.sessionHistory}</h2>

          {child.sessions.length === 0 && (
            <div className="text-center c-muted" style={{ padding: 40 }}>
              <p>{t.noSessions}</p>
            </div>
          )}

          {child.sessions.length > 0 && (
            <div className="flex-col gap-16">
              {[...child.sessions]
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                .map((session, idx) => {
                  const isCompleted = Boolean(session.finalNote?.trim()) || session.status === "completed";
                  const stageCount = session.records?.length || 0;
                  const stages = session.records?.map((r) => r.stageTitle).filter(Boolean).join(" → ") || "";

                  return (
                    <div key={session.sessionId || session.updatedAt} className="profile-field">
                      <div className="flex-row justify-between items-start mb-8">
                        <div>
                          <div className="fs-16 fw-500 mb-4">
                            {session.context || `${lang === "en" ? "Session" : "Сессия"} #${child.sessions.length - idx}`}
                          </div>
                          {stages && (
                            <div className="fs-12" style={{ color: "#9ca3af" }}>
                              {stages}
                            </div>
                          )}
                        </div>
                        <div className="flex-row gap-8 items-center">
                          <span className="br-999 fs-12 fw-500" style={{
                            padding: "4px 12px",
                            background: isCompleted ? "#d1fae5" : "#fef3c7",
                            color: isCompleted ? "#065f46" : "#92400e",
                          }}>
                            {isCompleted ? t.completedLabel : t.inProgressLabel}
                          </span>
                          <span className="br-999 fs-12 fw-500" style={{
                            padding: "4px 12px",
                            background: "#e0e7ff",
                            color: "#3730a3",
                          }}>
                            {stageCount} {t.stages}
                          </span>
                        </div>
                      </div>

                      {session.finalNote && (
                        <div className="fs-14 mb-8 p-8 br-6" style={{
                          color: "#374151",
                          background: "#fefce8",
                          border: "1px solid #fde68a",
                        }}>
                          <strong>{t.summary}:</strong> {session.finalNote}
                        </div>
                      )}

                      {session.historyInsight && (
                        <div className="mt-8 p-8 br-6 fs-13" style={{
                          background: "#f0fdf4",
                          border: "1px solid #bbf7d0",
                          color: "#166534",
                        }}>
                          💡 {session.historyInsight}
                        </div>
                      )}

                      <div className="fs-12 mt-8" style={{ color: "#9ca3af" }}>
                        {new Date(session.updatedAt).toLocaleString(lang === "en" ? "en-US" : "ru-RU")}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Планы на будущее */}
        <div className="p-24 bg-white br-12" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h3 className="fs-18 mb-16">{t.comingSoon}</h3>
          <ul className="c-muted" style={{ paddingLeft: 20 }}>
            <li>{t.progressCharts}</li>
            <li>{t.sessionComparison}</li>
            <li>{t.dataExport}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function ChildDetailPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        <ChildDetailContent />
      </Suspense>
    </ErrorBoundary>
  );
}
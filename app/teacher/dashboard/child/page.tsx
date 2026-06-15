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
          <h2 style={{ fontSize: 20, marginBottom: 16, color: "#dc2626" }}>{lang === "en" ? "Error" : "Ошибка"}</h2>
          <p style={{ color: "#6b7280", marginBottom: 24 }}>{t.errorNoId}</p>
          <Link
            href={withLang("/teacher", lang)}
            style={{
              padding: "12px 24px",
              background: "#4f46e5",
              color: "white",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 500,
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

  if (error || !child) {
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
          <h2 style={{ fontSize: 20, marginBottom: 16, color: "#dc2626" }}>{lang === "en" ? "Error" : "Ошибка"}</h2>
          <p style={{ color: "#6b7280", marginBottom: 24 }}>{error || t.errorNotFound}</p>
          <Link
            href={withLang("/teacher", lang)}
            style={{
              padding: "12px 24px",
              background: "#4f46e5",
              color: "white",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 500,
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
    <div style={{
      minHeight: "100vh",
      background: "#f3f4f6",
      padding: 20,
    }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <header style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h1 style={{ fontSize: 28, marginBottom: 8 }}>{displayName}</h1>
              <p style={{ color: "#6b7280" }}>
                {displayClass ? `${displayClass} · ` : ""}
                {child.sessions.length} {t.sessions}
              </p>
            </div>
            <LanguageToggle />
          </div>
        </header>

        <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
          <Link
            href={withLang("/teacher", lang)}
            style={{
              padding: "12px 24px",
              background: "#4f46e5",
              color: "white",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            {t.backToList}
          </Link>
          <Link
            href={`/adolescent?childId=${childId}&lang=${lang}`}
            style={{
              padding: "12px 24px",
              background: "#10b981",
              color: "white",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            {t.openSession}
          </Link>
        </div>

        {/* Статистика */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 32 }}>
          <div style={{ background: "white", padding: 24, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>{t.totalSessions}</div>
            <div style={{ fontSize: 36, fontWeight: "bold" }}>{child.sessions.length}</div>
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

        {/* Информация об ученике */}
        <div style={{
          background: "white",
          borderRadius: 12,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          padding: 24,
          marginBottom: 32,
        }}>
          <h2 style={{ fontSize: 20, marginBottom: 16 }}>{t.studentInfo}</h2>

          <div style={{ display: "grid", gap: 16 }}>
            <div style={{
              padding: 16,
              background: "#f9fafb",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
            }}>
              <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 4 }}>{t.name}</div>
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
              <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 4 }}>{t.studentId}</div>
              <div style={{ fontSize: 14, fontFamily: "monospace", color: "#374151" }}>{child.id}</div>
            </div>

            <div style={{
              padding: 16,
              background: "#f9fafb",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
            }}>
              <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 4 }}>{t.registrationDate}</div>
              <div style={{ fontSize: 18, fontWeight: 500 }}>
                {new Date(child.createdAt).toLocaleDateString(lang === "en" ? "en-US" : "ru-RU")}
              </div>
            </div>

            {child.teacherId && (
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
                  ✓ {t.teacherId}: {child.teacherId}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* История сессий */}
        <div style={{
          background: "white",
          borderRadius: 12,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          padding: 24,
          marginBottom: 32,
        }}>
          <h2 style={{ fontSize: 20, marginBottom: 16 }}>{t.sessionHistory}</h2>

          {child.sessions.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
              <p>{t.noSessions}</p>
            </div>
          )}

          {child.sessions.length > 0 && (
            <div style={{ display: "grid", gap: 16 }}>
              {[...child.sessions]
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                .map((session, idx) => {
                  const isCompleted = Boolean(session.finalNote?.trim()) || session.status === "completed";
                  const stageCount = session.records?.length || 0;
                  const stages = session.records?.map((r) => r.stageTitle).filter(Boolean).join(" → ") || "";

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
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>
                            {session.context || `${lang === "en" ? "Session" : "Сессия"} #${child.sessions.length - idx}`}
                          </div>
                          {stages && (
                            <div style={{ fontSize: 12, color: "#9ca3af" }}>
                              {stages}
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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
                          <span style={{
                            padding: "4px 12px",
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 500,
                            background: "#e0e7ff",
                            color: "#3730a3",
                          }}>
                            {stageCount} {t.stages}
                          </span>
                        </div>
                      </div>

                      {session.finalNote && (
                        <div style={{
                          fontSize: 14,
                          color: "#374151",
                          marginBottom: 8,
                          padding: 8,
                          background: "#fefce8",
                          borderRadius: 6,
                          border: "1px solid #fde68a",
                        }}>
                          <strong>{t.summary}:</strong> {session.finalNote}
                        </div>
                      )}

                      {session.historyInsight && (
                        <div style={{
                          marginTop: 8,
                          padding: 8,
                          background: "#f0fdf4",
                          borderRadius: 6,
                          border: "1px solid #bbf7d0",
                          fontSize: 13,
                          color: "#166534",
                        }}>
                          💡 {session.historyInsight}
                        </div>
                      )}

                      <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>
                        {new Date(session.updatedAt).toLocaleString(lang === "en" ? "en-US" : "ru-RU")}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Планы на будущее */}
        <div style={{ padding: 24, background: "white", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h3 style={{ fontSize: 18, marginBottom: 16 }}>{t.comingSoon}</h3>
          <ul style={{ color: "#6b7280", paddingLeft: 20 }}>
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
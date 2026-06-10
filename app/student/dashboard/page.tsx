"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Session {
  sessionId: string;
  status: "in_progress" | "completed";
  context: string;
  finalNote?: string;
  records?: any[];
  updatedAt: string;
}

interface ChildProfile {
  id: string;
  name: string;
  realData: {
    fio: string;
    klass: string;
  };
  createdAt: string;
  sessions: Session[];
  teacherId?: string;
}

export default function StudentDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ChildProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/children?childId=current");
        const data = await response.json();
        
        if (data.ok && data.child) {
          setProfile(data.child);
        } else {
          setError(data.error || "Не удалось загрузить профиль");
        }
      } catch (err) {
        setError("Ошибка подключения к серверу");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const completedSessions = profile?.sessions.filter(s => s.status === "completed") || [];
  const inProgressSessions = profile?.sessions.filter(s => s.status === "in_progress") || [];
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
        <div style={{ color: "#6b7280", fontSize: 20 }}>Загрузка...</div>
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
          <h2 style={{ fontSize: 20, marginBottom: 16, color: "#dc2626" }}>Ошибка</h2>
          <p style={{ color: "#6b7280", marginBottom: 24 }}>{error || "Профиль не найден"}</p>
          <Link
            href="/role-selection"
            style={{
              padding: "12px 24px",
              background: "#4f46e5",
              color: "white",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Вернуться к выбору роли
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f3f4f6",
      padding: 20,
    }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <header style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, marginBottom: 8 }}>Личный кабинет</h1>
          <p style={{ color: "#6b7280" }}>Ученик: {profile.realData.fio}</p>
        </header>

        <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
          <Link
            href="/"
            style={{
              padding: "12px 24px",
              background: "#4f46e5",
              color: "white",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            На главную
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 32 }}>
          <div style={{ background: "white", padding: 24, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>Всего сессий</div>
            <div style={{ fontSize: 36, fontWeight: "bold" }}>{totalSessions}</div>
          </div>
          <div style={{ background: "white", padding: 24, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>Завершено</div>
            <div style={{ fontSize: 36, fontWeight: "bold", color: "#10b981" }}>{completedSessions.length}</div>
          </div>
          <div style={{ background: "white", padding: 24, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>В процессе</div>
            <div style={{ fontSize: 36, fontWeight: "bold", color: "#f59e0b" }}>{inProgressSessions.length}</div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 24 }}>
          <div style={{ background: "white", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", padding: 24 }}>
            <h2 style={{ fontSize: 20, marginBottom: 16 }}>Профиль</h2>

            <div style={{ display: "grid", gap: 16 }}>
              <div style={{
                padding: 16,
                background: "#f9fafb",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
              }}>
                <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 4 }}>ФИО</div>
                <div style={{ fontSize: 18, fontWeight: 500 }}>{profile.realData.fio}</div>
              </div>

              <div style={{
                padding: 16,
                background: "#f9fafb",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
              }}>
                <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 4 }}>Класс</div>
                <div style={{ fontSize: 18, fontWeight: 500 }}>{profile.realData.klass}</div>
              </div>

              <div style={{
                padding: 16,
                background: "#f9fafb",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
              }}>
                <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 4 }}>Дата регистрации</div>
                <div style={{ fontSize: 18, fontWeight: 500 }}>
                  {new Date(profile.createdAt).toLocaleDateString("ru-RU")}
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
                    Привязан к учителю
                  </div>
                  <div style={{ fontSize: 14, color: "#047857" }}>
                    ✓ Подключён к системе обучения
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ background: "white", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", padding: 24 }}>
            <h2 style={{ fontSize: 20, marginBottom: 16 }}>История сессий</h2>

            {loading && <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>Загрузка...</div>}

            {!loading && totalSessions === 0 && (
              <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
                <p>У вас пока нет сессий</p>
                <p style={{ fontSize: 14, marginTop: 8 }}>
                  Начните обучение, обратившись к учителю
                </p>
              </div>
            )}

            {!loading && totalSessions > 0 && (
              <div style={{ display: "grid", gap: 16 }}>
                {profile.sessions.map((session) => (
                  <div
                    key={session.sessionId}
                    style={{
                      padding: 16,
                      background: "#f9fafb",
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ fontSize: 16, fontWeight: 500 }}>{session.context || "Сессия"}</div>
                      <span style={{
                        padding: "4px 12px",
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 500,
                        background: session.status === "completed" ? "#d1fae5" : "#fef3c7",
                        color: session.status === "completed" ? "#065f46" : "#92400e",
                      }}>
                        {session.status === "completed" ? "Завершена" : "В процессе"}
                      </span>
                    </div>
                    {session.finalNote && (
                      <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>
                        {session.finalNote}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>
                      {new Date(session.updatedAt).toLocaleString("ru-RU")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: 32, padding: 24, background: "white", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h3 style={{ fontSize: 18, marginBottom: 16 }}>Разделы в разработке</h3>
            <ul style={{ color: "#6b7280", paddingLeft: 20 }}>
              <li>Графики прогресса</li>
              <li>Обратная связь по сессиям</li>
              <li>Достижения и награды</li>
              <li>Настройки профиля</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
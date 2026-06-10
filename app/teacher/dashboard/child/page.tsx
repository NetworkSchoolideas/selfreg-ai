"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface Child {
  id: string;
  name: string;
  className: string;
  teacherId?: string;
  createdAt: string;
  realData?: {
    fio: string;
    klass: string;
  };
}

export default function ChildDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const childId = searchParams.get("childId");
  
  const [child, setChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!childId) return;

    const loadChild = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/children?childId=${childId}`);
        const data = await response.json();
        
        if (data.ok && data.child) {
          setChild(data.child);
        } else {
          setError(data.error || "Failed to load child");
        }
      } catch (err) {
        setError("Failed to connect to server");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadChild();
  }, [childId]);

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
          <h2 style={{ fontSize: 20, marginBottom: 16, color: "#dc2626" }}>Error</h2>
          <p style={{ color: "#6b7280", marginBottom: 24 }}>Child ID not provided</p>
          <Link
            href="/teacher/dashboard"
            style={{
              padding: "12px 24px",
              background: "#4f46e5",
              color: "white",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Back to Dashboard
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
        <div style={{ color: "#6b7280", fontSize: 20 }}>Loading...</div>
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
          <h2 style={{ fontSize: 20, marginBottom: 16, color: "#dc2626" }}>Error</h2>
          <p style={{ color: "#6b7280", marginBottom: 24 }}>{error || "Child not found"}</p>
          <Link
            href="/teacher/dashboard"
            style={{
              padding: "12px 24px",
              background: "#4f46e5",
              color: "white",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Back to Dashboard
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
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <header style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, marginBottom: 8 }}>Ученик</h1>
          <p style={{ color: "#6b7280" }}>Детальная информация</p>
        </header>

        <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
          <Link
            href="/teacher/dashboard"
            style={{
              padding: "12px 24px",
              background: "#4f46e5",
              color: "white",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Назад к списку
          </Link>
        </div>

        <div style={{
          background: "white",
          borderRadius: 12,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          padding: 32,
        }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 24, marginBottom: 16 }}>{child.name}</h2>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            <div style={{
              padding: 16,
              background: "#f9fafb",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
            }}>
              <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 4 }}>Имя</div>
              <div style={{ fontSize: 18, fontWeight: 500 }}>{child.name}</div>
            </div>

            <div style={{
              padding: 16,
              background: "#f9fafb",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
            }}>
              <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 4 }}>Класс</div>
              <div style={{ fontSize: 18, fontWeight: 500 }}>{child.className}</div>
            </div>

            <div style={{
              padding: 16,
              background: "#f9fafb",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
            }}>
              <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 4 }}>ID ученика</div>
              <div style={{ fontSize: 14, fontFamily: "monospace", color: "#374151" }}>{child.id}</div>
            </div>

            <div style={{
              padding: 16,
              background: "#f9fafb",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
            }}>
              <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 4 }}>Дата регистрации</div>
              <div style={{ fontSize: 18, fontWeight: 500 }}>
                {new Date(child.createdAt).toLocaleDateString("ru-RU")}
              </div>
            </div>

            {child.realData && (
              <div style={{
                padding: 16,
                background: "#fef3c7",
                borderRadius: 8,
                border: "1px solid #f59e0b",
              }}>
                <div style={{ fontSize: 14, color: "#92400e", marginBottom: 4 }}>
                  Полные данные (локально)
                </div>
                <div style={{ fontSize: 14, color: "#78350f" }}>
                  ФИО: {child.realData.fio}<br />
                  Класс: {child.realData.klass}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 32, padding: 24, background: "white", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h3 style={{ fontSize: 18, marginBottom: 16 }}>Раздел в разработке</h3>
          <ul style={{ color: "#6b7280", paddingLeft: 20 }}>
            <li>История сессий</li>
            <li>Графики прогресса</li>
            <li>Обратная связь по циклам</li>
            <li>Экспорт данных</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
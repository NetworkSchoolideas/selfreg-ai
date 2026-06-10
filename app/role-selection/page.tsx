"use client";

import { Suspense, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { LanguageToggle } from "@/app/components/LanguageToggle";
import type { AppLang } from "@/lib/app-i18n";

function RoleSelectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = (searchParams.get("lang") === "en" ? "en" : "ru") as AppLang;

  const texts = {
    ru: {
      title: "Выберите вашу роль",
      subtitle: "Чтобы продолжить, укажите, кем вы являетесь",
      teacher: "Я учитель",
      student: "Я ученик / родитель",
      teacherDesc: "Доступ к аналитике, управление учениками",
      studentDesc: "Сессии саморегуляции, развитие навыков",
      warning: "Выбор можно будет изменить в настройках профиля",
    },
    en: {
      title: "Select your role",
      subtitle: "To continue, please indicate who you are",
      teacher: "I am a teacher",
      student: "I am a student / parent",
      teacherDesc: "Access to analytics, manage students",
      studentDesc: "Self-regulation sessions, skill development",
      warning: "You can change this in profile settings later",
    },
  };

  const t = texts[lang];

  const handleRoleSelect = useCallback((role: "teacher" | "student") => {
    sessionStorage.setItem("selected_role", role);
    if (role === "teacher") {
      router.push(`/teacher/register?lang=${lang}`);
    } else {
      router.push(`/adolescent?lang=${lang}`);
    }
  }, [lang, router]);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      padding: 20,
    }}>
      <div style={{ position: "absolute", top: 20, right: 20 }}>
        <LanguageToggle />
      </div>

      <div style={{
        background: "white",
        borderRadius: 16,
        padding: 48,
        maxWidth: 600,
        width: "100%",
        boxShadow: "0 10px 40px rgba(0, 0, 0, 0.2)",
      }}>
        <h1 style={{ marginTop: 0, marginBottom: 16, fontSize: 32, textAlign: "center", color: "#1f2937" }}>
          {t.title}
        </h1>
        <p style={{ textAlign: "center", color: "#6b7280", marginBottom: 32, fontSize: 16 }}>
          {t.subtitle}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 24, marginBottom: 24 }}>
          <button
            onClick={() => handleRoleSelect("teacher")}
            style={{ padding: 32, borderRadius: 12, border: "2px solid #e5e7eb", background: "white", cursor: "pointer", textAlign: "left", transition: "all 0.2s ease", display: "flex", flexDirection: "column", gap: 12 }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#4f46e5"; e.currentTarget.style.background = "#f5f3ff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.background = "white"; }}
          >
            <div style={{ fontSize: 48, textAlign: "center" }}>👨‍🏫</div>
            <h3 style={{ margin: 0, fontSize: 20, color: "#1f2937" }}>{t.teacher}</h3>
            <p style={{ margin: 0, fontSize: 14, color: "#6b7280", lineHeight: 1.5 }}>{t.teacherDesc}</p>
          </button>

          <button
            onClick={() => handleRoleSelect("student")}
            style={{ padding: 32, borderRadius: 12, border: "2px solid #e5e7eb", background: "white", cursor: "pointer", textAlign: "left", transition: "all 0.2s ease", display: "flex", flexDirection: "column", gap: 12 }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#10b981"; e.currentTarget.style.background = "#ecfdf5"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.background = "white"; }}
          >
            <div style={{ fontSize: 48, textAlign: "center" }}>🎓</div>
            <h3 style={{ margin: 0, fontSize: 20, color: "#1f2937" }}>{t.student}</h3>
            <p style={{ margin: 0, fontSize: 14, color: "#6b7280", lineHeight: 1.5 }}>{t.studentDesc}</p>
          </button>
        </div>

        <div style={{ background: "#fef3c7", border: "1px solid #f59e0b", padding: 12, borderRadius: 8, fontSize: 13, color: "#92400e", textAlign: "center" }}>
          {t.warning}
        </div>
      </div>
    </div>
  );
}

export default function RoleSelectionPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      }}>
        <div style={{ color: "white", fontSize: 20 }}>Загрузка...</div>
      </div>
    }>
      <RoleSelectionContent />
    </Suspense>
  );
}

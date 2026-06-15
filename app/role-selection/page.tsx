"use client";

import { Suspense, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { LanguageToggle } from "@/app/components/LanguageToggle";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";
import { withLang, type AppLang } from "@/lib/app-i18n";

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
    // Save role preference and redirect to registration with role parameter
    sessionStorage.setItem("selected_role", role);
    router.push(withLang(`/auth/register?role=${role}`, lang));
  }, [lang, router]);

  return (
    <div className="gradient-bg-role">
      <div className="absolute" style={{ top: 20, right: 20 }}>
        <LanguageToggle />
      </div>

      <div className="white-card-sm">
        <h1 className="m-0 mb-16 fs-32 text-center" style={{ color: "#1f2937" }}>
          {t.title}
        </h1>
        <p className="text-center c-muted mb-32 fs-16">
          {t.subtitle}
        </p>

        <div className="grid mb-24" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}>
          <button
            onClick={() => handleRoleSelect("teacher")}
            className="role-card"
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#4f46e5"; e.currentTarget.style.background = "#f5f3ff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.background = "white"; }}
          >
            <div className="fs-48 text-center">👨‍🏫</div>
            <h3 className="m-0 fs-20" style={{ color: "#1f2937" }}>{t.teacher}</h3>
            <p className="m-0 fs-14 c-muted" style={{ lineHeight: 1.5 }}>{t.teacherDesc}</p>
          </button>

          <button
            onClick={() => handleRoleSelect("student")}
            className="role-card"
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#10b981"; e.currentTarget.style.background = "#ecfdf5"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.background = "white"; }}
          >
            <div className="fs-48 text-center">🎓</div>
            <h3 className="m-0 fs-20" style={{ color: "#1f2937" }}>{t.student}</h3>
            <p className="m-0 fs-14 c-muted" style={{ lineHeight: 1.5 }}>{t.studentDesc}</p>
          </button>
        </div>

        <div className="warning-box">
          {t.warning}
        </div>
      </div>
    </div>
  );
}

export default function RoleSelectionPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div className="centered-message gradient-bg-role">
          <div className="loading-text">Загрузка...</div>
        </div>
      }>
        <RoleSelectionContent />
      </Suspense>
    </ErrorBoundary>
  );
}

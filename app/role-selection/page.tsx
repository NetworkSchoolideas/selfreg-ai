"use client";

import Link from "next/link";
import { Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { LanguageToggle } from "@/app/components/LanguageToggle";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";
import { normalizeAppLang, withLang } from "@/lib/app-i18n";

function RoleSelectionContent() {
  const searchParams = useSearchParams();
  const lang = normalizeAppLang(searchParams.get("lang"));

  const texts = {
    ru: {
      title: "Выберите вашу роль",
      subtitle: "Чтобы продолжить, укажите, кто вы",
      teacher: "Я педагог",
      student: "Я ученик / родитель",
      teacherDesc: "Доступ к аналитике и управлению учениками",
      studentDesc: "Сессии саморегуляции и развитие навыков",
      warning: "Роль можно изменить позже в настройках профиля",
    },
    en: {
      title: "Choose your role",
      subtitle: "To continue, tell us who you are",
      teacher: "I am a teacher",
      student: "I am a student or parent",
      teacherDesc: "Access analytics and manage students",
      studentDesc: "Join self-regulation sessions and build skills",
      warning: "You can change your role later in profile settings",
    },
  };

  const t = texts[lang];

  const handleRoleSelect = useCallback((role: "teacher" | "student") => {
    sessionStorage.setItem("selected_role", role);
  }, []);

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
          <Link
            href={withLang("/auth/register?role=teacher", lang)}
            onClick={() => handleRoleSelect("teacher")}
            className="role-card"
            onMouseEnter={(event) => {
              event.currentTarget.style.borderColor = "#4f46e5";
              event.currentTarget.style.background = "#f5f3ff";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.borderColor = "#e5e7eb";
              event.currentTarget.style.background = "white";
            }}
            style={{ display: "block", textDecoration: "none" }}
          >
            <div className="fs-48 text-center" aria-hidden="true">👩‍🏫</div>
            <h3 className="m-0 fs-20" style={{ color: "#1f2937" }}>{t.teacher}</h3>
            <p className="m-0 fs-14 c-muted" style={{ lineHeight: 1.5 }}>{t.teacherDesc}</p>
          </Link>

          <Link
            href={withLang("/auth/register?role=student", lang)}
            onClick={() => handleRoleSelect("student")}
            className="role-card"
            onMouseEnter={(event) => {
              event.currentTarget.style.borderColor = "#10b981";
              event.currentTarget.style.background = "#ecfdf5";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.borderColor = "#e5e7eb";
              event.currentTarget.style.background = "white";
            }}
            style={{ display: "block", textDecoration: "none" }}
          >
            <div className="fs-48 text-center" aria-hidden="true">🎓</div>
            <h3 className="m-0 fs-20" style={{ color: "#1f2937" }}>{t.student}</h3>
            <p className="m-0 fs-14 c-muted" style={{ lineHeight: 1.5 }}>{t.studentDesc}</p>
          </Link>
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
      <Suspense
        fallback={
          <div className="centered-message gradient-bg-role">
            <div className="loading-text">Loading...</div>
          </div>
        }
      >
        <RoleSelectionContent />
      </Suspense>
    </ErrorBoundary>
  );
}

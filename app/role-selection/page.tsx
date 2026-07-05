"use client";

import { Suspense, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LanguageToggle } from "@/app/components/LanguageToggle";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";
import { normalizeAppLang, withLang } from "@/lib/app-i18n";

function RoleSelectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = normalizeAppLang(searchParams.get("lang"));
  const [isSavingRole, setIsSavingRole] = useState<"teacher" | "student" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const t = {
    title: lang === "en" ? "Choose your role" : "Выберите вашу роль",
    subtitle: lang === "en" ? "To continue, tell us who you are" : "Чтобы продолжить, укажите, кто вы",
    teacher: lang === "en" ? "I am a teacher" : "Я педагог",
    student: lang === "en" ? "I am a student or parent" : "Я ученик или родитель",
    teacherDesc: lang === "en" ? "Access analytics and manage students" : "Доступ к аналитике и управлению учениками",
    studentDesc: lang === "en" ? "Join self-regulation sessions and build skills" : "Сессии саморегуляции и развитие навыков",
    warning: lang === "en"
      ? "This choice will be saved to your profile."
      : "Этот выбор будет сохранен в вашем профиле.",
    error: lang === "en"
      ? "Could not save your role. Try again."
      : "Не удалось сохранить роль. Попробуйте еще раз.",
    saving: lang === "en" ? "Saving..." : "Сохраняем...",
  };

  const handleRoleSelect = useCallback(async (role: "teacher" | "student") => {
    setError(null);
    setIsSavingRole(role);
    sessionStorage.setItem("selected_role", role);

    try {
      const response = await fetch("/api/profile-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      if (response.status === 401) {
        router.push(withLang(role === "teacher" ? "/teacher/register" : "/auth/register?role=student", lang));
        return;
      }

      const payload = await response.json();
      if (!response.ok || !payload?.nextPath) {
        throw new Error(payload?.error || t.error);
      }

      router.push(withLang(payload.nextPath, lang));
      router.refresh();
    } catch {
      setError(t.error);
      setIsSavingRole(null);
    }
  }, [lang, router, t.error]);

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
            type="button"
            onClick={() => void handleRoleSelect("teacher")}
            disabled={isSavingRole !== null}
            className="role-card"
            onMouseEnter={(event) => {
              event.currentTarget.style.borderColor = "#4f46e5";
              event.currentTarget.style.background = "#f5f3ff";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.borderColor = "#e5e7eb";
              event.currentTarget.style.background = "white";
            }}
            style={{ display: "block", textDecoration: "none", textAlign: "left", width: "100%", cursor: "pointer" }}
          >
            <div className="fs-48 text-center" aria-hidden="true">👩‍🏫</div>
            <h3 className="m-0 fs-20" style={{ color: "#1f2937" }}>
              {isSavingRole === "teacher" ? t.saving : t.teacher}
            </h3>
            <p className="m-0 fs-14 c-muted" style={{ lineHeight: 1.5 }}>{t.teacherDesc}</p>
          </button>

          <button
            type="button"
            onClick={() => void handleRoleSelect("student")}
            disabled={isSavingRole !== null}
            className="role-card"
            onMouseEnter={(event) => {
              event.currentTarget.style.borderColor = "#10b981";
              event.currentTarget.style.background = "#ecfdf5";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.borderColor = "#e5e7eb";
              event.currentTarget.style.background = "white";
            }}
            style={{ display: "block", textDecoration: "none", textAlign: "left", width: "100%", cursor: "pointer" }}
          >
            <div className="fs-48 text-center" aria-hidden="true">🎓</div>
            <h3 className="m-0 fs-20" style={{ color: "#1f2937" }}>
              {isSavingRole === "student" ? t.saving : t.student}
            </h3>
            <p className="m-0 fs-14 c-muted" style={{ lineHeight: 1.5 }}>{t.studentDesc}</p>
          </button>
        </div>

        {error && <div className="error-box">{error}</div>}

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

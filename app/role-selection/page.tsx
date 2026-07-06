"use client";

import Link from "next/link";
import { Suspense, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LanguageToggle } from "@/app/components/LanguageToggle";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";
import { normalizeAppLang, withLang } from "@/lib/app-i18n";

function RoleSelectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = normalizeAppLang(searchParams.get("lang"));
  const requiresProfileRole = searchParams.get("auth") === "role_required";
  const [isSavingRole, setIsSavingRole] = useState<"teacher" | "student" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const t = {
    title: lang === "en" ? "Choose your role" : "\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0432\u0430\u0448\u0443 \u0440\u043e\u043b\u044c",
    subtitle: lang === "en" ? "To continue, tell us who you are" : "\u0427\u0442\u043e\u0431\u044b \u043f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c, \u0443\u043a\u0430\u0436\u0438\u0442\u0435, \u043a\u0442\u043e \u0432\u044b",
    teacher: lang === "en" ? "I am a teacher" : "\u042f \u043f\u0435\u0434\u0430\u0433\u043e\u0433",
    student: lang === "en" ? "I am a student or parent" : "\u042f \u0443\u0447\u0435\u043d\u0438\u043a \u0438\u043b\u0438 \u0440\u043e\u0434\u0438\u0442\u0435\u043b\u044c",
    teacherDesc: lang === "en" ? "Access analytics and manage students" : "\u0414\u043e\u0441\u0442\u0443\u043f \u043a \u0430\u043d\u0430\u043b\u0438\u0442\u0438\u043a\u0435 \u0438 \u0443\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u044e \u0443\u0447\u0435\u043d\u0438\u043a\u0430\u043c\u0438",
    studentDesc: lang === "en" ? "Join self-regulation sessions and build skills" : "\u0421\u0435\u0441\u0441\u0438\u0438 \u0441\u0430\u043c\u043e\u0440\u0435\u0433\u0443\u043b\u044f\u0446\u0438\u0438 \u0438 \u0440\u0430\u0437\u0432\u0438\u0442\u0438\u0435 \u043d\u0430\u0432\u044b\u043a\u043e\u0432",
    warning: lang === "en"
      ? "This choice will be saved to your profile."
      : "\u042d\u0442\u043e\u0442 \u0432\u044b\u0431\u043e\u0440 \u0431\u0443\u0434\u0435\u0442 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d \u0432 \u0432\u0430\u0448\u0435\u043c \u043f\u0440\u043e\u0444\u0438\u043b\u0435.",
    error: lang === "en"
      ? "Could not save your role. Try again."
      : "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0440\u043e\u043b\u044c. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0435 \u0440\u0430\u0437.",
    saving: lang === "en" ? "Saving..." : "\u0421\u043e\u0445\u0440\u0430\u043d\u044f\u0435\u043c...",
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

  const handleRoleLinkClick = useCallback((
    event: React.MouseEvent<HTMLAnchorElement>,
    role: "teacher" | "student",
  ) => {
    sessionStorage.setItem("selected_role", role);

    if (!requiresProfileRole) {
      return;
    }

    event.preventDefault();
    void handleRoleSelect(role);
  }, [handleRoleSelect, requiresProfileRole]);

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
            href={withLang("/teacher/register", lang)}
            onClick={(event) => handleRoleLinkClick(event, "teacher")}
            aria-disabled={isSavingRole !== null}
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
            <div className="fs-48 text-center" aria-hidden="true">{"\u{1f469}\u200d\u{1f3eb}"}</div>
            <h3 className="m-0 fs-20" style={{ color: "#1f2937" }}>
              {isSavingRole === "teacher" ? t.saving : t.teacher}
            </h3>
            <p className="m-0 fs-14 c-muted" style={{ lineHeight: 1.5 }}>{t.teacherDesc}</p>
          </Link>

          <Link
            href={withLang("/auth/register?role=student", lang)}
            onClick={(event) => handleRoleLinkClick(event, "student")}
            aria-disabled={isSavingRole !== null}
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
            <div className="fs-48 text-center" aria-hidden="true">{"\u{1f393}"}</div>
            <h3 className="m-0 fs-20" style={{ color: "#1f2937" }}>
              {isSavingRole === "student" ? t.saving : t.student}
            </h3>
            <p className="m-0 fs-14 c-muted" style={{ lineHeight: 1.5 }}>{t.studentDesc}</p>
          </Link>
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

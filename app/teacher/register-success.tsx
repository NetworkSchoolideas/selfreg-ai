"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { AppLang } from "@/lib/app-i18n";
import { copyTextToClipboard } from "@/lib/clipboard";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";

function TeacherRegisterSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = (searchParams.get("lang") === "en" ? "en" : "ru") as AppLang;

  const [countdown, setCountdown] = useState(10);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const nextTarget = searchParams.get("next") === "dashboard" ? "dashboard" : "login";
  const pendingEmail = searchParams.get("pendingEmail") === "1";
  const teacherCode =
    searchParams.get("teacherCode") ||
    (typeof window !== "undefined" ? sessionStorage.getItem("teacher_code") || "" : "");

  const texts = {
    ru: {
      title: "Регистрация успешна!",
      subtitle: "Ваш код учителя:",
      code: "Код учителя",
      copy: "Копировать",
      copied: "Скопировано!",
      copyError: "Не удалось скопировать автоматически. Скопируйте код вручную.",
      saveCode: "Сохраните этот код: ученикам он понадобится, чтобы привязаться к вашему аккаунту.",
      pendingEmailNotice: "Аккаунт создан. Подтвердите email, затем войдите в систему.",
      nextSteps: "Дальнейшие шаги:",
      step1: "Поделитесь кодом с учениками",
      step2: "Ученики вводят код при регистрации",
      step3: "Отслеживайте прогресс в дашборде",
      goToLogin: "Перейти ко входу",
      goToDashboard: "Перейти в дашборд",
      autoRedirect: "Автоматическое перенаправление через",
      loading: "Загрузка...",
    },
    en: {
      title: "Registration successful!",
      subtitle: "Your teacher code:",
      code: "Teacher code",
      copy: "Copy",
      copied: "Copied!",
      copyError: "Automatic copy is unavailable. Copy the code manually.",
      saveCode: "Save this code: students will need it to link to your account.",
      pendingEmailNotice: "Account created. Confirm your email, then sign in.",
      nextSteps: "Next steps:",
      step1: "Share the code with students",
      step2: "Students enter the code during registration",
      step3: "Track progress in the dashboard",
      goToLogin: "Go to login",
      goToDashboard: "Go to dashboard",
      autoRedirect: "Automatic redirect in",
      loading: "Loading...",
    },
  };

  const t = texts[lang];

  useEffect(() => {
    if (!teacherCode) {
      return;
    }

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }

    router.push(nextTarget === "dashboard" ? `/teacher?lang=${lang}` : `/auth/login?role=teacher&lang=${lang}`);
  }, [countdown, lang, nextTarget, router, teacherCode]);

  const copyToClipboard = useCallback(async () => {
    try {
      await copyTextToClipboard(teacherCode);
      setCopyError(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopyError(true);
    }
  }, [teacherCode]);

  if (!teacherCode) {
    return (
      <div className="gradient-bg-teacher centered-message">
        <div className="loading-text">{t.loading}</div>
      </div>
    );
  }

  return (
    <div className="gradient-bg-teacher">
      <div className="white-card text-center">
        <div className="fs-64 mb-16">OK</div>

        <h1 className="mt-0 mb-8 fs-28" style={{ color: "#1f2937" }}>
          {t.title}
        </h1>

        <p className="c-muted mb-24 fs-14">{t.subtitle}</p>

        <div className="code-box">
          <div className="fs-14 c-muted mb-8">{t.code}</div>
          <div className="code-value">{teacherCode}</div>
          <button onClick={copyToClipboard} className="copy-btn">
            {copied ? t.copied : t.copy}
          </button>
          {copyError && (
            <div className="mt-8 fs-13" style={{ color: "#b45309" }}>
              {t.copyError}
            </div>
          )}
        </div>

        <div className="warning-box mb-24">
          <div>{t.saveCode}</div>
          {pendingEmail && (
            <div className="mt-8 fw-500">{t.pendingEmailNotice}</div>
          )}
        </div>

        <div className="text-left mb-24">
          <h3 className="fs-16 mb-12" style={{ color: "#1f2937" }}>{t.nextSteps}</h3>
          <ol className="c-muted fs-14 p-0 m-0" style={{ paddingLeft: 20 }}>
            <li className="mb-8">{t.step1}</li>
            <li className="mb-8">{t.step2}</li>
            <li>{t.step3}</li>
          </ol>
        </div>

        <Link
          href={nextTarget === "dashboard" ? `/teacher?lang=${lang}` : `/auth/login?role=teacher&lang=${lang}`}
          className="no-underline fs-16 fw-500"
          style={{
            display: "block",
            padding: 14,
            borderRadius: 8,
            background: "#10b981",
            color: "white",
          }}
        >
          {nextTarget === "dashboard" ? t.goToDashboard : t.goToLogin}
        </Link>

        <div className="mt-16 fs-13" style={{ color: "#9ca3af" }}>
          {t.autoRedirect} {countdown}...
        </div>
      </div>
    </div>
  );
}

function RegisterSuccessWrapper() {
  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        <TeacherRegisterSuccessPage />
      </Suspense>
    </ErrorBoundary>
  );
}

export default RegisterSuccessWrapper;

"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { AppLang } from "@/lib/app-i18n";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";

function TeacherRegisterSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = (searchParams.get("lang") === "en" ? "en" : "ru") as AppLang;

  const [countdown, setCountdown] = useState(10);
  const [copied, setCopied] = useState(false);
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
      saveCode: "Сохраните этот код: ученикам он понадобится, чтобы привязаться к вашему аккаунту.",
      nextSteps: "Дальнейшие шаги:",
      step1: "Поделитесь кодом с учениками",
      step2: "Ученики вводят код при регистрации",
      step3: "Отслеживайте прогресс в дашборде",
      goToLogin: "Перейти ко входу",
      autoRedirect: "Автоматическое перенаправление через",
      loading: "Загрузка...",
      copiedAlert: "Код скопирован!",
    },
    en: {
      title: "Registration successful!",
      subtitle: "Your teacher code:",
      code: "Teacher code",
      copy: "Copy",
      copied: "Copied!",
      saveCode: "Save this code: students will need it to link to your account.",
      nextSteps: "Next steps:",
      step1: "Share the code with students",
      step2: "Students enter the code during registration",
      step3: "Track progress in the dashboard",
      goToLogin: "Go to login",
      autoRedirect: "Automatic redirect in",
      loading: "Loading...",
      copiedAlert: "Code copied!",
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

    router.push(`/auth/login?role=teacher&lang=${lang}`);
  }, [countdown, lang, router, teacherCode]);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(teacherCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
      alert(t.copiedAlert);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [teacherCode, t.copiedAlert]);

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
        </div>

        <div className="warning-box mb-24">{t.saveCode}</div>

        <div className="text-left mb-24">
          <h3 className="fs-16 mb-12" style={{ color: "#1f2937" }}>{t.nextSteps}</h3>
          <ol className="c-muted fs-14 p-0 m-0" style={{ paddingLeft: 20 }}>
            <li className="mb-8">{t.step1}</li>
            <li className="mb-8">{t.step2}</li>
            <li>{t.step3}</li>
          </ol>
        </div>

        <Link
          href={`/auth/login?role=teacher&lang=${lang}`}
          className="no-underline fs-16 fw-500"
          style={{
            display: "block",
            padding: 14,
            borderRadius: 8,
            background: "#10b981",
            color: "white",
          }}
        >
          {t.goToLogin}
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

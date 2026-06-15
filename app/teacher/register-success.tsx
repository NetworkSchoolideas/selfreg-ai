"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { AppLang } from "@/lib/app-i18n";

export default function TeacherRegisterSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = (searchParams.get("lang") === "en" ? "en" : "ru") as AppLang;
  
  const [teacherCode, setTeacherCode] = useState("");
  const [countdown, setCountdown] = useState(10);

  const texts = {
    ru: {
      title: "Регистрация успешна!",
      subtitle: "Ваш код учителя:",
      code: "Код учителя",
      copy: "Копировать",
      copied: "Скопировано!",
      saveCode: "Сохраните этот код — он понадобится ученикам для привязки к вашему аккаунту",
      nextSteps: "Дальнейшие шаги:",
      step1: "Поделитесь кодом с учениками",
      step2: "Ученики вводят код при регистрации",
      step3: "Отслеживайте прогресс в дашборде",
      goToDashboard: "Перейти к входу",
      autoRedirect: "Автоматическое перенаправление через",
    },
    en: {
      title: "Registration successful!",
      subtitle: "Your teacher code:",
      code: "Teacher Code",
      copy: "Copy",
      copied: "Copied!",
      saveCode: "Save this code - students will need it to link to your account",
      nextSteps: "Next steps:",
      step1: "Share the code with students",
      step2: "Students enter the code during registration",
      step3: "Access dashboard and analytics",
      goToDashboard: "Go to login",
      autoRedirect: "Redirecting in",
    },
  };

  const t = texts[lang];


  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      router.push(`/api/auth/callback?provider=login&lang=${lang}`);
    }
  }, [countdown, lang, router]);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(teacherCode);
      alert(lang === "en" ? "Code copied!" : "Код скопирован!");
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [teacherCode, lang]);

  if (!teacherCode) {
    return (
      <div className="gradient-bg-teacher centered-message">
        <div className="loading-text">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="gradient-bg-teacher">
      <div className="white-card text-center">
        <div className="fs-64 mb-16">✅</div>
        
        <h1 className="mt-0 mb-8 fs-28" style={{ color: "#1f2937" }}>
          {t.title}
        </h1>
        
        <p className="c-muted mb-24 fs-14">
          {t.subtitle}
        </p>

        <div className="code-box">
          <div className="fs-14 c-muted mb-8">{t.code}</div>
          <div className="code-value">
            {teacherCode}
          </div>
          <button onClick={copyToClipboard} className="copy-btn">
            {t.copy}
          </button>
        </div>

        <div className="warning-box mb-24">
          {t.saveCode}
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
          href={`/api/auth/callback?provider=login&lang=${lang}`}
          className="no-underline fs-16 fw-500"
          style={{
            display: "block",
            padding: 14,
            borderRadius: 8,
            background: "#10b981",
            color: "white",
          }}
        >
          {t.goToDashboard}
        </Link>

        <div className="mt-16 fs-13" style={{ color: "#9ca3af" }}>
          {t.autoRedirect} {countdown}...
        </div>
      </div>
    </div>
  );
}

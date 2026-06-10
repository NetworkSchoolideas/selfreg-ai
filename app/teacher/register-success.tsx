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
      saveCode: "Сохраните этот код - он понадобится для привязки учеников",
      nextSteps: "Следующие шаги:",
      step1: "Поделитесь кодом с учениками",
      step2: "Ученики вводят код при регистрации",
      step3: "Доступ к дашборду и аналитике",
      goToDashboard: "Перейти к входу",
      autoRedirect: "Перенаправление через",
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
    const code = searchParams.get("teacherCode") || sessionStorage.getItem("teacher_code") || "";
    setTeacherCode(code);
  }, [searchParams]);

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
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
      }}>
        <div style={{ color: "white", fontSize: 20 }}>Загрузка...</div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
      padding: 20,
    }}>
      <div style={{
        background: "white",
        borderRadius: 16,
        padding: 40,
        maxWidth: 500,
        width: "100%",
        boxShadow: "0 10px 40px rgba(0, 0, 0, 0.2)",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
        
        <h1 style={{ marginTop: 0, marginBottom: 8, fontSize: 28, color: "#1f2937" }}>
          {t.title}
        </h1>
        
        <p style={{ color: "#6b7280", marginBottom: 24, fontSize: 14 }}>
          {t.subtitle}
        </p>

        <div style={{
          background: "#f0fdf4",
          border: "2px solid #10b981",
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
        }}>
          <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>{t.code}</div>
          <div style={{ fontSize: 32, fontWeight: "bold", color: "#059669", letterSpacing: 2, marginBottom: 12 }}>
            {teacherCode}
          </div>
          <button
            onClick={copyToClipboard}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "1px solid #10b981",
              background: "white",
              color: "#10b981",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            {t.copy}
          </button>
        </div>

        <div style={{
          background: "#fef3c7",
          border: "1px solid #f59e0b",
          padding: 12,
          borderRadius: 8,
          marginBottom: 24,
          fontSize: 13,
          color: "#92400e",
        }}>
          {t.saveCode}
        </div>

        <div style={{ textAlign: "left", marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, color: "#1f2937", marginBottom: 12 }}>{t.nextSteps}</h3>
          <ol style={{ color: "#6b7280", fontSize: 14, paddingLeft: 20, margin: 0 }}>
            <li style={{ marginBottom: 8 }}>{t.step1}</li>
            <li style={{ marginBottom: 8 }}>{t.step2}</li>
            <li>{t.step3}</li>
          </ol>
        </div>

        <Link
          href={`/api/auth/callback?provider=login&lang=${lang}`}
          style={{
            display: "block",
            padding: 14,
            borderRadius: 8,
            background: "#10b981",
            color: "white",
            textDecoration: "none",
            fontSize: 16,
            fontWeight: 500,
          }}
        >
          {t.goToDashboard}
        </Link>

        <div style={{ marginTop: 16, fontSize: 13, color: "#9ca3af" }}>
          {t.autoRedirect} {countdown}...
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { AuthButton } from "@/app/components/AuthButton";
import { LanguageToggle } from "@/app/components/LanguageToggle";
import { normalizeAppLang, withLang } from "@/lib/app-i18n";

const projectLandingUrl =
  process.env.NEXT_PUBLIC_PROJECT_LANDING_URL || "https://selfreg-ai-networkschool.vercel.app";

export function HomeClient() {
  const searchParams = useSearchParams();
  const lang = normalizeAppLang(searchParams.get("lang"));

  useEffect(() => {
    const hasAuthCode = searchParams.has("code");
    const hasOtpToken = searchParams.has("token_hash") && searchParams.has("type");
    const hasAuthError = searchParams.has("error");

    if (!hasAuthCode && !hasOtpToken && !hasAuthError) {
      return;
    }

    const callbackUrl = new URL("/auth/callback", window.location.origin);
    searchParams.forEach((value, key) => {
      callbackUrl.searchParams.set(key, value);
    });

    if (!callbackUrl.searchParams.has("role")) {
      const pendingRole = window.localStorage.getItem("selfreg_pending_role");
      if (pendingRole === "teacher" || pendingRole === "student") {
        callbackUrl.searchParams.set("role", pendingRole);
      }
    }

    if (!callbackUrl.searchParams.has("lang")) {
      callbackUrl.searchParams.set("lang", lang);
    }

    window.location.replace(callbackUrl.toString());
  }, [lang, searchParams]);

  return (
    <main className="shell">
      <div className="topbar app-header">
        <div>
          <h1>SelfReg AI</h1>
          <p className="muted">
            {lang === "en"
              ? "Adolescent self-regulation sessions, teacher analytics, and connectable AI through API."
              : "Сессии саморегуляции для подростков, аналитика для педагога и подключаемый ИИ через API."}
          </p>
        </div>
        <div className="action-row">
          <AuthButton lang={lang} />
          <LanguageToggle />
          <Link className="button" href={withLang("/adolescent", lang)}>
            {lang === "en" ? "Open session" : "Открыть сессию"}
          </Link>
          <Link className="button secondary" href={withLang("/teacher", lang)}>
            {lang === "en" ? "Teacher dashboard" : "Дашборд педагога"}
          </Link>
        </div>
      </div>

      <section className="grid mt-24">
        <article className="panel">
          <h2>{lang === "en" ? "Adolescent" : "Подросток"}</h2>
          <p>
            {lang === "en"
              ? "A short instruction, clear questions, a personal context, and a final recommendation after five stages."
              : "Короткая инструкция, понятные вопросы, личный контекст и итоговая рекомендация после пяти шагов."}
          </p>
        </article>
        <article className="panel">
          <h2>{lang === "en" ? "Teacher" : "Педагог"}</h2>
          <p>
            {lang === "en"
              ? "Answer history, self-regulation stages, A/B pattern, AI feedback, and a short interpretation of the session."
              : "История ответов, этапы саморегуляции, сценарий A/B, фидбек ИИ и краткая интерпретация динамики."}
          </p>
        </article>
        <article className="panel">
          <h2>{lang === "en" ? "Architecture" : "Архитектура"}</h2>
          <p>
            {lang === "en"
              ? "Next.js on Vercel, protected session storage, and adaptable AI provider connections."
              : "Next.js на Vercel, защищённое хранение сессий и подключаемые ИИ-провайдеры."}
          </p>
        </article>
        <article className="panel">
          <h2>{lang === "en" ? "Bring your own key" : "Свой ИИ-ключ"}</h2>
          <p>
            {lang === "en"
              ? "GitHub Models is the recommended live provider. OpenRouter is an advanced option, GigaChat is in development, and mock mode works without external AI."
              : "GitHub Models — рекомендуемый рабочий провайдер. OpenRouter — расширенный вариант, GigaChat находится в разработке, а mock-режим работает без внешнего ИИ."}
          </p>
        </article>
      </section>

      <section className="panel roadmap">
        <h2>{lang === "en" ? "Current product contour" : "Текущий контур продукта"}</h2>
        <ol>
          <li>{lang === "en" ? "Public app entry on Vercel." : "Публичная точка входа приложения на Vercel."}</li>
          <li>{lang === "en" ? "A complete adolescent self-regulation session flow." : "Полный сценарий прохождения сессии саморегуляции подростком."}</li>
          <li>{lang === "en" ? "A teacher dashboard with session review and analytics." : "Дашборд педагога с разбором сессий и аналитикой."}</li>
          <li>{lang === "en" ? "A BYOK path for connecting a custom AI provider key." : "BYOK-контур для подключения собственного ключа ИИ-провайдера."}</li>
        </ol>
        <div className="action-row">
          <Link className="button secondary" href={withLang("/settings", lang)}>
            {lang === "en" ? "API settings" : "Настройки API"}
          </Link>
          <a
            className="button secondary"
            href={projectLandingUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {lang === "en" ? "Project landing" : "Лендинг проекта"}
          </a>
        </div>
      </section>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthButton } from "@/app/components/AuthButton";
import { LanguageToggle } from "@/app/components/LanguageToggle";
import { normalizeAppLang, withLang } from "@/lib/app-i18n";

const projectLandingUrl =
  process.env.NEXT_PUBLIC_PROJECT_LANDING_URL || "https://selfreg-ai-networkschool.vercel.app";

export function HomeClient() {
  const searchParams = useSearchParams();
  const lang = normalizeAppLang(searchParams.get("lang"));

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
              ? "Next.js on Vercel, AI provider adapters, future session storage, and the transition from the Telegram test to a web app."
              : "Next.js на Vercel, адаптеры для ИИ-провайдеров, будущая база сессий и переход от Telegram-теста к веб-приложению."}
          </p>
        </article>
        <article className="panel">
          <h2>{lang === "en" ? "Bring your own key" : "Свой ИИ-ключ"}</h2>
          <p>
            {lang === "en"
              ? "GigaChat, OpenRouter, GitHub Models, or a compatible API can be connected through one provider layer. For demos, mock mode is available."
              : "GigaChat, OpenRouter, GitHub Models или совместимый API подключаются через единый слой провайдеров. Для демо доступен mock-режим."}
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

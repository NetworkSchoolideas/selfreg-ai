"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LanguageToggle } from "@/app/components/LanguageToggle";
import { AuthButton } from "@/app/components/AuthButton";
import { normalizeAppLang, withLang } from "@/lib/app-i18n";

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
              ? "Web prototype: adolescent dialogue, teacher dashboard, and connectable AI through API."
              : "Веб-прототип: подростковый диалог, педагогический дашборд и подключаемый ИИ через API."}
          </p>
        </div>
        <div className="action-row">
          <AuthButton lang={lang} />
          <LanguageToggle />
          <Link className="button" href={withLang("/adolescent", lang)}>
            {lang === "en" ? "Open prototype" : "Открыть прототип"}
          </Link>
          <Link className="button secondary" href={withLang("/teacher", lang)}>
            {lang === "en" ? "Teacher dashboard" : "Дашборд педагога"}
          </Link>
        </div>
      </div>

      <section className="grid" style={{ marginTop: 24 }}>
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
        <h2>{lang === "en" ? "What is already demonstrated" : "Что уже демонстрируем"}</h2>
        <ol>
          <li>{lang === "en" ? "A working public project page on Vercel." : "Рабочую публичную страницу проекта на Vercel."}</li>
          <li>{lang === "en" ? "A web prototype of the adolescent self-regulation path." : "Веб-прототип прохождения контура саморегуляции подростком."}</li>
          <li>{lang === "en" ? "A teacher view with answer interpretation." : "Педагогический экран с интерпретацией ответов."}</li>
          <li>{lang === "en" ? "A technical path for connecting a custom API key." : "Технический путь к подключению собственного API-ключа."}</li>
        </ol>
        <div className="action-row">
          <Link className="button secondary" href={withLang("/settings", lang)}>
            {lang === "en" ? "API settings" : "Настройки API"}
          </Link>
          {/* 
            PRODUCTION: Замени эти ссылки на реальные URL после деплоя в Vercel.
            Лендинг и приложение должны ссылаться друг на друга.
          */}
          <a 
            className="button secondary" 
            href="https://selfreg-ai-networkschool.vercel.app" 
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

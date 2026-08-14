"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LanguageToggle } from "@/app/components/LanguageToggle";
import { normalizeAppLang, withLang } from "@/lib/app-i18n";
import { getProviderMeta, getReleaseProviders } from "@/lib/provider-registry";
import { ProviderCheck } from "./ProviderCheck";

export function SettingsScreen() {
  const searchParams = useSearchParams();
  const lang = normalizeAppLang(searchParams.get("lang"));

  const ui = {
    eyebrow: lang === "en" ? "Deployment" : "Развертка",
    title: lang === "en" ? "Connect your own AI API" : "Подключение собственного ИИ API",
    intro:
      lang === "en"
        ? "Start without a key in Mock mode, or connect your own OpenRouter, Groq, or GigaChat key for a live response."
        : "Начните без ключа в Mock-режиме или подключите собственный ключ OpenRouter, Groq либо GigaChat для живого ответа.",
    home: lang === "en" ? "Home" : "Главная",
    sessionApp: lang === "en" ? "Session app" : "Сессия",
    securityTitle: lang === "en" ? "Security rule" : "Правило безопасности",
    securityText:
      lang === "en"
        ? "Use only your own key. Do not place it in the repository, public HTML, logs, or Vercel environment variables."
        : "Используйте только собственный ключ. Не размещайте его в репозитории, публичном HTML, логах или переменных окружения Vercel.",
    variable: lang === "en" ? "Variable" : "Переменная",
    model: lang === "en" ? "Model" : "Модель",
    docs: lang === "en" ? "Documentation" : "Документация",
  };

  return (
    <main className="shell">
      <div className="topbar app-header">
        <div>
          <p className="eyebrow">{ui.eyebrow}</p>
          <h1>{ui.title}</h1>
          <p className="muted">{ui.intro}</p>
        </div>
        <div className="action-row">
          <LanguageToggle />
          <Link className="button secondary" href={withLang("/", lang)}>
            {ui.home}
          </Link>
          <Link className="button" href={withLang("/adolescent", lang)}>
            {ui.sessionApp}
          </Link>
        </div>
      </div>

      <section className="panel" style={{ marginTop: 24 }}>
        <h2>{ui.securityTitle}</h2>
        <p>{ui.securityText}</p>
      </section>

      <ProviderCheck />

      <section className="grid" style={{ marginTop: 16 }}>
        {getReleaseProviders().map((provider) => {
          const meta = getProviderMeta(provider.id, lang);
          return (
            <article className="panel" key={provider.id}>
              <h2>{meta.title}</h2>
              {provider.releaseStatus === "recommended" && (
                <p className="muted">{lang === "en" ? "Status: recommended starting point." : "Статус: рекомендуемый стартовый вариант."}</p>
              )}
              {provider.releaseStatus === "advanced" && (
                <p className="muted">{lang === "en" ? "Status: supported alternative; test the key before a session." : "Статус: поддерживаемая альтернатива; проверьте ключ перед сессией."}</p>
              )}
              <p className="muted">{meta.note}</p>
              <p>
                <strong>{ui.variable}:</strong> {meta.keyLabel}
              </p>
              <p>
                <strong>{ui.model}:</strong> {meta.defaultModel}
              </p>
              <a href={meta.docsUrl} target="_blank" rel="noreferrer">
                {ui.docs}
              </a>
            </article>
          );
        })}
      </section>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LanguageToggle } from "@/app/components/LanguageToggle";
import { normalizeAppLang, withLang } from "@/lib/app-i18n";
import { getProviderMeta, PROVIDERS } from "@/lib/provider-registry";
import { ProviderCheck } from "./ProviderCheck";

export function SettingsScreen() {
  const searchParams = useSearchParams();
  const lang = normalizeAppLang(searchParams.get("lang"));

  const ui = {
    eyebrow: lang === "en" ? "Deployment" : "Развертка",
    title: lang === "en" ? "Connect your own AI API" : "Подключение собственного ИИ API",
    intro:
      lang === "en"
        ? "The prototype demonstrates BYOK architecture: a team or organization chooses a provider and plugs in its own key. A safe mock mode is available for demos without external spend."
        : "Прототип показывает архитектуру BYOK: команда или организация выбирает провайдера и подключает свой ключ. Для демонстрации без внешних списаний доступен безопасный mock-режим.",
    home: lang === "en" ? "Home" : "Главная",
    prototype: lang === "en" ? "Prototype" : "Прототип",
    securityTitle: lang === "en" ? "Security rule" : "Правило безопасности",
    securityText:
      lang === "en"
        ? "An API key must not end up in the repository, public HTML, or client logs. In the pilot we use Vercel environment variables or a one-time key check on the server API layer."
        : "API-ключ не должен попадать в репозиторий, публичный HTML или клиентские логи. В пилоте используем переменные окружения Vercel или одноразовую проверку ключа на серверном API-слое.",
    variable: lang === "en" ? "Variable" : "Переменная",
    model: lang === "en" ? "Model" : "Модель",
    docs: lang === "en" ? "Documentation" : "Документация"
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
            {ui.prototype}
          </Link>
        </div>
      </div>

      <section className="panel" style={{ marginTop: 24 }}>
        <h2>{ui.securityTitle}</h2>
        <p>{ui.securityText}</p>
      </section>

      <ProviderCheck />

      <section className="grid" style={{ marginTop: 16 }}>
        {PROVIDERS.map((provider) => {
          const meta = getProviderMeta(provider.id, lang);
          return (
            <article className="panel" key={provider.id}>
              <h2>{meta.title}</h2>
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

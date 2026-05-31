"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { normalizeAppLang } from "@/lib/app-i18n";
import { PROVIDERS, type ProviderId } from "@/lib/provider-registry";

function getProviderDefaultModel(provider: ProviderId) {
  return PROVIDERS.find((item) => item.id === provider)?.defaultModel || "";
}

export function ProviderCheck() {
  const searchParams = useSearchParams();
  const lang = normalizeAppLang(searchParams.get("lang"));

  const ui = {
    title: lang === "en" ? "Check the key" : "Проверить ключ",
    hint:
      lang === "en"
        ? "The key is sent only to the server-side check route and is not stored in the browser."
        : "Ключ отправляется только на серверный route проверки и не сохраняется в браузере.",
    provider: lang === "en" ? "Provider" : "Провайдер",
    model: lang === "en" ? "Model" : "Модель",
    apiKey: lang === "en" ? "API key" : "API-ключ",
    apiKeyPlaceholder: lang === "en" ? "Not needed for mock" : "Для mock не нужен",
    check: lang === "en" ? "Check" : "Проверить",
    checking: lang === "en" ? "Checking..." : "Проверяю...",
    initialStatus: lang === "en" ? "Provider check has not started yet." : "Проверка еще не запускалась.",
    checkingStatus: lang === "en" ? "Checking connection..." : "Проверяю подключение...",
    errorPrefix: lang === "en" ? "Error: " : "Ошибка: ",
    successPrefix: lang === "en" ? "Connection works. Mode: " : "Подключение работает. Режим: ",
    successSample: lang === "en" ? ". Sample reply: " : ". Пример ответа: "
  };

  const [provider, setProvider] = useState<ProviderId>("mock");
  const [model, setModel] = useState(getProviderDefaultModel("mock"));
  const [userApiKey, setUserApiKey] = useState("");
  const [status, setStatus] = useState(ui.initialStatus);
  const [isChecking, setIsChecking] = useState(false);

  async function checkProvider() {
    setIsChecking(true);
    setStatus(ui.checkingStatus);

    try {
      const response = await fetch("/api/provider-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          model: model.trim() || undefined,
          userApiKey: userApiKey.trim() || undefined,
          lang
        })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || (lang === "en" ? "provider check failed" : "проверка не прошла"));
      }

      const modeLabel =
        data.responseMode === "llm-json"
          ? lang === "en"
            ? "structured LLM reply"
            : "структурированный LLM-ответ"
          : data.responseMode === "llm-text"
            ? lang === "en"
              ? "free-text LLM reply"
              : "свободный LLM-текст"
            : data.responseMode === "llm-fallback"
              ? lang === "en"
                ? "external reply with local safety fallback"
                : "внешний ответ с локальной страховкой"
              : lang === "en"
                ? "mock reply"
                : "mock-ответ";

      setStatus(`${ui.successPrefix}${modeLabel}${ui.successSample}${data.sample}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : lang === "en" ? "unknown error" : "неизвестная ошибка";
      setStatus(`${ui.errorPrefix}${message}`);
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <section className="panel provider-check">
      <h2>{ui.title}</h2>
      <p className="muted">{ui.hint}</p>
      <div className="provider-row">
        <label className="field compact">
          <span>{ui.provider}</span>
          <select
            value={provider}
            onChange={(event) => {
              const nextProvider = event.target.value as ProviderId;
              setProvider(nextProvider);
              setModel(getProviderDefaultModel(nextProvider));
            }}
          >
            <option value="mock">Mock</option>
            <option value="gigachat">GigaChat</option>
            <option value="openrouter">OpenRouter</option>
            <option value="github-models">GitHub Models</option>
            <option value="vercel-gateway">Vercel AI Gateway</option>
          </select>
        </label>
        <label className="field compact">
          <span>{ui.model}</span>
          <input value={model} onChange={(event) => setModel(event.target.value)} placeholder="GigaChat, openrouter/free, or openai/gpt-4o-mini" />
        </label>
      </div>
      <label className="field">
        <span>{ui.apiKey}</span>
        <input
          type="password"
          value={userApiKey}
          onChange={(event) => setUserApiKey(event.target.value)}
          placeholder={ui.apiKeyPlaceholder}
          autoComplete="off"
        />
      </label>
      <div className="action-row" style={{ marginTop: 14 }}>
        <button className="button" type="button" onClick={checkProvider} disabled={isChecking}>
          {isChecking ? ui.checking : ui.check}
        </button>
      </div>
      <p className="muted small-text">{status}</p>
    </section>
  );
}

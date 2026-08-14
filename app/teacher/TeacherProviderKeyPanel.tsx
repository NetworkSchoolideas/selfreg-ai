"use client";

import { useMemo, useState } from "react";
import { ApiKeyManager, type KeyStatus } from "@/app/components/ApiKeyManager";
import type { AppLang } from "@/lib/app-i18n";
import { getFreeChatModels, getReleaseProviders, PROVIDERS, type ProviderId } from "@/lib/provider-registry";
import type { Session } from "@/lib/children-storage";

function getDefaultModel(provider: ProviderId) {
  return PROVIDERS.find((item) => item.id === provider)?.defaultModel || "";
}

export function TeacherProviderKeyPanel({ lang, childId, session }: { lang: AppLang; childId?: string; session?: Session | null }) {
  const [provider, setProvider] = useState<ProviderId>("gigachat");
  const [model, setModel] = useState(getDefaultModel("gigachat"));
  const [apiKey, setApiKey] = useState("");
  const [keyStatus, setKeyStatus] = useState<KeyStatus | null>(null);
  const [result, setResult] = useState<{ summary: string; questions: string[]; nextStep: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const ui = useMemo(
    () => ({
      title: lang === "en" ? "Your AI provider key" : "Ваш ключ ИИ-провайдера",
      description:
        lang === "en"
          ? "Check a personal key here. When you select a completed session, you can request a short preparation for a respectful conversation."
          : "Проверьте здесь личный ключ. После выбора завершённой сессии можно запросить краткую подготовку к уважительному разговору.",
      provider: lang === "en" ? "Provider" : "Провайдер",
      model: lang === "en" ? "Model" : "Модель",
      modelHint:
        lang === "en"
          ? "Only models suitable for ordinary session replies are shown."
          : "Показаны только модели, подходящие для обычного ответа в сессии.",
      prepare: lang === "en" ? "Prepare conversation questions" : "Подготовить вопросы к разговору",
      preparing: lang === "en" ? "Preparing..." : "Готовим...",
      selectCompleted:
        lang === "en" ? "Select a completed session to prepare a conversation." : "Выберите завершённую сессию, чтобы подготовить разговор.",
      keyNeeded: lang === "en" ? "Save your provider key first." : "Сначала сохраните ключ провайдера.",
      summary: lang === "en" ? "Factual session view" : "Факты о сессии",
      questions: lang === "en" ? "Questions to consider" : "Вопросы для разговора",
      nextStep: lang === "en" ? "A calm next step" : "Спокойный следующий шаг",
      boundary:
        lang === "en"
          ? "The result is for conversation preparation only. The server sends a short process summary for the selected session, not raw answers, the learner’s name or ID. It is not a diagnosis or assessment, is not stored, and does not change the student session."
          : "Результат нужен только для подготовки разговора. Сервер отправляет краткое описание хода выбранной сессии, а не сырые ответы, имя или идентификатор ученика. Это не диагноз и не оценка, он не сохраняется и не меняет сессию ученика.",
    }),
    [lang],
  );

  const models = getFreeChatModels(provider);
  const isCompleted = Boolean(session && (session.status === "completed" || session.finalNote?.trim()));

  async function prepareConversation() {
    if (!childId || !session || !isCompleted) return;
    if (!apiKey.trim()) {
      setError(ui.keyNeeded);
      return;
    }

    setIsPreparing(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/teacher-conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId,
          sessionUpdatedAt: session.updatedAt,
          provider,
          model,
          userApiKey: apiKey,
          lang,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : `HTTP ${response.status}`);
      }
      setResult(data.result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : lang === "en" ? "Could not prepare the conversation." : "Не удалось подготовить разговор.");
    } finally {
      setIsPreparing(false);
    }
  }

  return (
    <section className="panel mb-16" aria-labelledby="teacher-provider-key-title">
      <h3 id="teacher-provider-key-title" className="fs-15 analytics-section-title">{ui.title}</h3>
      <p className="muted">{ui.description}</p>
      <div className="provider-row">
        <label className="field compact">
          <span>{ui.provider}</span>
          <select
            value={provider}
            onChange={(event) => {
              const nextProvider = event.target.value as ProviderId;
              setProvider(nextProvider);
              setModel(getDefaultModel(nextProvider));
            }}
          >
            {getReleaseProviders().filter((item) => item.id !== "mock").map((item) => (
              <option key={item.id} value={item.id}>{item.title}</option>
            ))}
          </select>
        </label>
        <label className="field compact">
          <span>{ui.model}</span>
          {models ? (
            <select value={model} onChange={(event) => setModel(event.target.value)}>
              {models.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          ) : (
            <input value={model} onChange={(event) => setModel(event.target.value)} />
          )}
        </label>
      </div>
      {models && <p className="muted small-text">{ui.modelHint}</p>}
      <ApiKeyManager lang={lang} provider={provider} model={model} onKeyChange={setApiKey} onStatusChange={setKeyStatus} />
      <p className="muted small-text">{ui.boundary}</p>
      {isCompleted ? (
        <button
          type="button"
          className="button"
          disabled={isPreparing || !apiKey.trim() || keyStatus?.isTesting}
          onClick={prepareConversation}
        >
          {isPreparing ? ui.preparing : ui.prepare}
        </button>
      ) : (
        <p className="muted small-text">{ui.selectCompleted}</p>
      )}
      {error && <p role="alert" className="small-text" style={{ color: "#b42318" }}>{error}</p>}
      {result && (
        <div className="profile-field mt-12" aria-live="polite">
          <strong>{ui.summary}</strong>
          <p className="p-line">{result.summary}</p>
          <strong>{ui.questions}</strong>
          <ul>
            {result.questions.map((question, index) => <li key={`${index}-${question}`}>{question}</li>)}
          </ul>
          <strong>{ui.nextStep}</strong>
          <p className="p-line">{result.nextStep}</p>
        </div>
      )}
    </section>
  );
}

"use client";

import { useMemo, useState } from "react";
import { validateGigaChatKey, getGigaChatAccessToken } from "@/lib/gigachat-token";

interface ApiKeyManagerProps {
  lang: "ru" | "en";
  provider: string;
  onKeyChange: (key: string) => void;
}

function readSavedKey(provider: string) {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(`api_key_${provider}`) ?? "";
}

export function ApiKeyManager({ lang, provider, onKeyChange }: ApiKeyManagerProps) {
  const savedKey = readSavedKey(provider);
  const [isExpanded, setIsExpanded] = useState(false);
  const [key, setKey] = useState(savedKey);
  const [isSaved, setIsSaved] = useState(Boolean(savedKey));
  const [isValid, setIsValid] = useState(
    provider !== "gigachat" || !savedKey || validateGigaChatKey(savedKey),
  );
  const [testStatus, setTestStatus] = useState<string | null>(null);

  const ui = useMemo(
    () => ({
      title: lang === "en" ? "API key settings" : "Настройки API-ключа",
      description:
        lang === "en"
          ? "Save a key for the selected provider. It remains in this browser."
          : "Сохраните ключ для выбранного провайдера. Он остается в этом браузере.",
      placeholder:
        lang === "en"
          ? provider === "gigachat"
            ? "Paste GigaChat Authorization Key: base64(Client_ID:Client_Secret)"
            : "Paste your API key"
          : provider === "gigachat"
            ? "Вставьте Authorization Key GigaChat: base64(Client_ID:Client_Secret)"
            : "Вставьте API-ключ",
      save: lang === "en" ? "Save" : "Сохранить",
      clear: lang === "en" ? "Clear" : "Удалить",
      cancel: lang === "en" ? "Cancel" : "Отмена",
      test: lang === "en" ? "Test key" : "Проверить ключ",
      saved: lang === "en" ? "Saved" : "Сохранено",
      notSet: lang === "en" ? "not set" : "не задан",
      invalid: lang === "en" ? "invalid" : "ошибка",
      testing: lang === "en" ? "Testing..." : "Проверяем...",
      invalidFormat:
        lang === "en"
          ? "Invalid key format. Expected: base64(Client_ID:Client_Secret)."
          : "Неверный формат ключа. Нужен base64(Client_ID:Client_Secret).",
      validKey:
        lang === "en"
          ? "Key is valid. Access token received."
          : "Ключ работает. Access token получен.",
      invalidKey: lang === "en" ? "Invalid key" : "Ключ не прошел проверку",
      note:
        lang === "en"
          ? "For the demo, the key is stored only locally. Do not enter a personal key on shared devices."
          : "В демо ключ хранится только локально. Не вводите личный ключ на общем устройстве.",
      gigachatNote:
        lang === "en"
          ? "GigaChat expects an Authorization Key in base64(Client_ID:Client_Secret) format."
          : "Для GigaChat нужен Authorization Key в формате base64(Client_ID:Client_Secret).",
      testHint:
        lang === "en"
          ? "Test the key before using the prototype."
          : "Проверьте ключ перед запуском прототипа.",
    }),
    [lang, provider],
  );

  const syncFromStorage = () => {
    const nextKey = readSavedKey(provider);
    setKey(nextKey);
    setIsSaved(Boolean(nextKey));
    setIsValid(provider !== "gigachat" || !nextKey || validateGigaChatKey(nextKey));
    setTestStatus(null);
    onKeyChange(nextKey);
  };

  const handleExpand = () => {
    syncFromStorage();
    setIsExpanded(true);
  };

  const handleSave = () => {
    const trimmedKey = key.trim();

    if (!trimmedKey) {
      localStorage.removeItem(`api_key_${provider}`);
      setIsSaved(false);
      setIsValid(true);
      setTestStatus(null);
      onKeyChange("");
      setIsExpanded(false);
      return;
    }

    if (provider === "gigachat" && !validateGigaChatKey(trimmedKey)) {
      setIsValid(false);
      setTestStatus(ui.invalidFormat);
      return;
    }

    localStorage.setItem(`api_key_${provider}`, trimmedKey);
    setIsSaved(true);
    setIsValid(true);
    setTestStatus(null);
    onKeyChange(trimmedKey);
    setIsExpanded(false);
  };

  const handleClear = () => {
    setKey("");
    localStorage.removeItem(`api_key_${provider}`);
    setIsSaved(false);
    setIsValid(true);
    setTestStatus(null);
    onKeyChange("");
  };

  const handleTestKey = async () => {
    const trimmedKey = key.trim();
    if (!trimmedKey || provider !== "gigachat") return;

    if (!validateGigaChatKey(trimmedKey)) {
      setIsValid(false);
      setTestStatus(ui.invalidFormat);
      return;
    }

    setTestStatus(ui.testing);

    try {
      await getGigaChatAccessToken(trimmedKey);
      setTestStatus(ui.validKey);
      setIsValid(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : ui.invalidKey;
      setTestStatus(`${ui.invalidKey}: ${message}`);
      setIsValid(false);
    }
  };

  return (
    <div style={{ marginTop: 12 }}>
      {!isExpanded ? (
        <button
          type="button"
          className="button secondary"
          onClick={handleExpand}
          style={{ fontSize: 13, padding: "6px 12px" }}
        >
          {isSaved
            ? isValid
              ? `API: ${ui.saved}`
              : `API: ${ui.invalid}`
            : `API: ${ui.notSet}`}
        </button>
      ) : (
        <div
          style={{
            background: "var(--soft)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            padding: 16,
            marginTop: 8,
          }}
        >
          <h4 style={{ margin: "0 0 8px 0", fontSize: 14 }}>{ui.title}</h4>
          <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
            {ui.description}
          </p>

          {provider === "gigachat" && (
            <p
              style={{
                fontSize: 12,
                marginBottom: 12,
                background: isValid ? "#d4edda" : "#f8d7da",
                border: `1px solid ${isValid ? "#c3e6cb" : "#f5c6cb"}`,
                borderRadius: 6,
                padding: "8px 12px",
                color: isValid ? "#155724" : "#721c24",
              }}
            >
              {ui.gigachatNote}
            </p>
          )}

          <input
            type="password"
            value={key}
            onChange={(event) => {
              const nextKey = event.target.value;
              setKey(nextKey);
              if (provider === "gigachat") {
                setIsValid(!nextKey.trim() || validateGigaChatKey(nextKey));
              }
              setTestStatus(null);
            }}
            placeholder={ui.placeholder}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid var(--line)",
              fontSize: 13,
              marginBottom: 12,
              boxSizing: "border-box",
            }}
          />

          {testStatus && (
            <div
              style={{
                marginBottom: 12,
                padding: "8px 12px",
                borderRadius: 6,
                fontSize: 13,
                background: isValid ? "#d4edda" : "#fff3cd",
                border: `1px solid ${isValid ? "#c3e6cb" : "#ffeeba"}`,
                color: isValid ? "#155724" : "#856404",
              }}
            >
              {testStatus}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" className="button" onClick={handleSave} style={{ fontSize: 13, padding: "6px 12px" }}>
              {ui.save}
            </button>

            {provider === "gigachat" && (
              <button
                type="button"
                className="button secondary"
                onClick={handleTestKey}
                disabled={!key.trim()}
                style={{ fontSize: 13, padding: "6px 12px" }}
              >
                {ui.test}
              </button>
            )}

            <button type="button" className="button secondary" onClick={handleClear} style={{ fontSize: 13, padding: "6px 12px" }}>
              {ui.clear}
            </button>

            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--muted)",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              {ui.cancel}
            </button>
          </div>

          <p className="muted" style={{ fontSize: 11, marginTop: 12 }}>
            {ui.note}
          </p>
          {provider === "gigachat" && (
            <p className="muted" style={{ fontSize: 11 }}>
              {ui.testHint}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

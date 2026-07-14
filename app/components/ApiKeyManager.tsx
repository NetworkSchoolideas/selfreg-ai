"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { validateGigaChatKey, getGigaChatAccessToken } from "@/lib/gigachat-token";

export interface KeyStatus {
  isValid: boolean | null;
  isTesting: boolean;
  hasSavedKey: boolean;
}

interface ApiKeyManagerProps {
  lang: "ru" | "en";
  provider: string;
  model?: string;
  onKeyChange: (key: string) => void;
  onStatusChange?: (status: KeyStatus) => void;
}

export type KeyStorage = "local" | "session";

export function readSavedKey(provider: string): { key: string; storage: KeyStorage } {
  if (typeof window === "undefined") return { key: "", storage: "session" };
  const session = sessionStorage.getItem(`api_key_${provider}`) ?? "";
  if (session) return { key: session, storage: "session" };
  const local = localStorage.getItem(`api_key_${provider}`) ?? "";
  if (local) return { key: local, storage: "local" };
  return { key: "", storage: "session" };
}

function saveKey(provider: string, key: string, storage: KeyStorage) {
  localStorage.removeItem(`api_key_${provider}`);
  sessionStorage.removeItem(`api_key_${provider}`);
  if (!key) return;
  if (storage === "local") {
    localStorage.setItem(`api_key_${provider}`, key);
  } else {
    sessionStorage.setItem(`api_key_${provider}`, key);
  }
}

function removeKey(provider: string) {
  localStorage.removeItem(`api_key_${provider}`);
  sessionStorage.removeItem(`api_key_${provider}`);
}

export function ApiKeyManager({ lang, provider, model, onKeyChange, onStatusChange }: ApiKeyManagerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [key, setKey] = useState("");
  const [storage, setStorage] = useState<KeyStorage>("session");
  const [isSaved, setIsSaved] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const ui = useMemo(
    () => ({
      title: lang === "en" ? "API key settings" : "Настройки API-ключа",
      description:
        lang === "en"
          ? "Use your own key only for the selected provider. It stays in this tab by default."
          : "Используйте собственный ключ только для выбранного провайдера. По умолчанию он остаётся только в этой вкладке.",
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
      valid: lang === "en" ? "Key works" : "Ключ работает",
      invalidFormat:
        lang === "en"
          ? "Invalid key format. Expected: base64(Client_ID:Client_Secret)."
          : "Неверный формат ключа. Нужен base64(Client_ID:Client_Secret).",
      validKey:
        lang === "en"
          ? "Key is valid. Connection established."
          : "Ключ работает. Подключение установлено.",
      invalidKey: lang === "en" ? "Invalid key" : "Ключ не прошёл проверку",
      note:
        lang === "en"
          ? "The key is sent only with the current request and is never stored on the server. Do not enter a personal key on shared devices."
          : "Ключ передаётся только с текущим запросом и не сохраняется на сервере. Не вводите личный ключ на общем устройстве.",
      gigachatNote:
        lang === "en"
          ? "GigaChat expects an Authorization Key in base64(Client_ID:Client_Secret) format."
          : "Для GigaChat нужен Authorization Key в формате base64(Client_ID:Client_Secret).",
      testHint:
        lang === "en"
          ? "Test the key before starting a live session."
          : "Проверьте ключ перед запуском прототипа.",
      persistentStorageLabel:
        lang === "en"
          ? "Keep this key in this browser after closing the tab"
          : "Сохранить ключ в браузере после закрытия вкладки",
      persistentStorageHint:
        lang === "en"
          ? "Off by default. When off, the key is cleared when you close the tab."
          : "По умолчанию выключено. Если не включать, ключ удалится при закрытии вкладки.",
      notTested: lang === "en" ? "not tested" : "не проверен",
      testFailed: lang === "en" ? "Test failed" : "Ошибка проверки",
    }),
    [lang, provider],
  );

  // Notify parent of key status changes
  useEffect(() => {
    onStatusChange?.({ isValid, isTesting, hasSavedKey: isSaved });
  }, [isValid, isTesting, isSaved, onStatusChange]);

  function syncFromStorage() {
    const next = readSavedKey(provider);
    setKey(next.key);
    setStorage(next.storage);
    setIsSaved(Boolean(next.key));
    setIsValid(provider !== "gigachat" || !next.key || validateGigaChatKey(next.key) ? null : false);
    setTestStatus(null);
    onKeyChange(next.key);
  }

  // Storage is browser-only. Loading it after hydration avoids a server/client
  // mismatch and keeps a resumed exercise request in sync with the visible key.
  useEffect(() => {
    queueMicrotask(() => {
      const next = readSavedKey(provider);
      setKey(next.key);
      setStorage(next.storage);
      setIsSaved(Boolean(next.key));
      setIsValid(provider !== "gigachat" || !next.key || validateGigaChatKey(next.key) ? null : false);
      setTestStatus(null);
      onKeyChange(next.key);
    });
  }, [onKeyChange, provider]);

  function handleExpand() {
    syncFromStorage();
    setIsExpanded(true);
  }

  function handleSave() {
    const trimmedKey = key.trim();

    if (!trimmedKey) {
      removeKey(provider);
      setIsSaved(false);
      setIsValid(null);
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

    saveKey(provider, trimmedKey, storage);
    setIsSaved(true);
    setIsValid(null);
    setTestStatus(null);
    onKeyChange(trimmedKey);
    setIsExpanded(false);
  }

  function handleClear() {
    setKey("");
    removeKey(provider);
    setIsSaved(false);
    setIsValid(null);
    setTestStatus(null);
    onKeyChange("");
  }

  const performKeyTest = useCallback(async (keyToTest: string): Promise<boolean> => {
    try {
      if (provider === "gigachat") {
        if (!validateGigaChatKey(keyToTest)) return false;
        await getGigaChatAccessToken(keyToTest);
        return true;
      }

      const response = await fetch("/api/provider-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          model,
          userApiKey: keyToTest,
          lang,
        }),
      });
      const data = await response.json();
      return response.ok && data.ok;
    } catch {
      return false;
    }
  }, [lang, model, provider]);

  async function handleTestKey() {
    const trimmedKey = key.trim();
    if (!trimmedKey) return;

    if (provider === "gigachat" && !validateGigaChatKey(trimmedKey)) {
      setIsValid(false);
      setTestStatus(ui.invalidFormat);
      return;
    }

    setTestStatus(ui.testing);
    setIsTesting(true);

    try {
      const ok = await performKeyTest(trimmedKey);
      setIsValid(ok);
      setTestStatus(ok ? ui.validKey : `${ui.invalidKey}: ${ui.testFailed}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : ui.invalidKey;
      setTestStatus(`${ui.invalidKey}: ${message}`);
      setIsValid(false);
    } finally {
      setIsTesting(false);
    }
  }

  const statusColor = isValid === true ? "#d4edda" : isValid === false ? "#f8d7da" : "#fff3cd";
  const statusTextColor = isValid === true ? "#155724" : isValid === false ? "#721c24" : "#856404";
  const statusBorderColor = isValid === true ? "#c3e6cb" : isValid === false ? "#f5c6cb" : "#ffeeba";

  return (
    <div style={{ marginTop: 12 }}>
      {!isExpanded ? (
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            className="button secondary"
            onClick={handleExpand}
            style={{ fontSize: 13, padding: "6px 12px" }}
          >
            {isSaved
              ? isValid === true
                ? `🔑 ${ui.saved} ✓`
                : isValid === false
                  ? `🔑 ${ui.invalid}`
                  : `🔑 ${ui.saved}`
              : `🔑 ${ui.notSet}`}
          </button>
          {isSaved && isValid === null && !isTesting && (
            <button
              type="button"
              className="button secondary"
              onClick={handleTestKey}
              style={{ fontSize: 12, padding: "4px 10px" }}
            >
              {ui.test}
            </button>
          )}
          {isTesting && (
            <span style={{ fontSize: 12, color: "var(--muted)" }}>{ui.testing}</span>
          )}
        </div>
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
                background: isValid === false ? "#f8d7da" : "#d4edda",
                border: `1px solid ${isValid === false ? "#f5c6cb" : "#c3e6cb"}`,
                borderRadius: 6,
                padding: "8px 12px",
                color: isValid === false ? "#721c24" : "#155724",
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
                setIsValid(!nextKey.trim() || validateGigaChatKey(nextKey) ? null : false);
              } else {
                setIsValid(null);
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

          {/* Persistent browser storage is an explicit opt-in; session storage is the default. */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              marginBottom: 12,
              cursor: "pointer",
              color: "var(--muted)",
            }}
          >
            <input
              type="checkbox"
              checked={storage === "local"}
              onChange={(e) => setStorage(e.target.checked ? "local" : "session")}
            />
            <span>{ui.persistentStorageLabel}</span>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>
              ({ui.persistentStorageHint})
            </span>
          </label>

          {testStatus && (
            <div
              style={{
                marginBottom: 12,
                padding: "8px 12px",
                borderRadius: 6,
                fontSize: 13,
                background: statusColor,
                border: `1px solid ${statusBorderColor}`,
                color: statusTextColor,
              }}
            >
              {testStatus}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" className="button" onClick={handleSave} style={{ fontSize: 13, padding: "6px 12px" }}>
              {ui.save}
            </button>

            {provider !== "mock" && (
              <button
                type="button"
                className="button secondary"
                onClick={handleTestKey}
                disabled={!key.trim() || isTesting}
                style={{ fontSize: 13, padding: "6px 12px" }}
              >
                {isTesting ? ui.testing : ui.test}
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
          {provider !== "mock" && (
            <p className="muted" style={{ fontSize: 11 }}>
              {ui.testHint}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

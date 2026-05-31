"use client";

import { useState, useEffect } from "react";
import { validateGigaChatKey, getGigaChatAccessToken } from "@/lib/gigachat-token";

interface ApiKeyManagerProps {
  lang: "ru" | "en";
  provider: string;
  onKeyChange: (key: string) => void;
}

export function ApiKeyManager({ lang, provider, onKeyChange }: ApiKeyManagerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [key, setKey] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  // Load saved key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem(`api_key_${provider}`);
    if (savedKey) {
      setKey(savedKey);
      setIsSaved(true);
      // Validate GigaChat key format
      if (provider === 'gigachat') {
        setIsValid(validateGigaChatKey(savedKey));
      }
    }
  }, [provider]);

  const handleSave = () => {
    if (!key.trim()) {
      localStorage.removeItem(`api_key_${provider}`);
      setIsSaved(false);
      setIsValid(true);
    } else {
      // Validate GigaChat key format
      if (provider === 'gigachat') {
        const valid = validateGigaChatKey(key.trim());
        if (!valid) {
          setIsValid(false);
          setTestStatus(lang === "en" 
            ? "Invalid key format. Expected: base64(Client_ID:Client_Secret)"
            : "Неверный формат ключа. Ожидается: base64(Client_ID:Client_Secret)");
          return;
        }
      }
      
      localStorage.setItem(`api_key_${provider}`, key.trim());
      setIsSaved(true);
      setIsValid(true);
      setTestStatus(null);
    }
    onKeyChange(key.trim());
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
    if (!key.trim() || provider !== 'gigachat') return;
    
    setTestStatus(lang === "en" ? "Testing..." : "Проверка...");
    
    try {
      // Try to get access token
      await getGigaChatAccessToken(key.trim());
      
      setTestStatus(lang === "en" 
        ? "✓ Key is valid! Access token obtained successfully."
        : "✓ Ключ валиден! Access token получен успешно.");
      setIsValid(true);
    } catch (err: any) {
      setTestStatus(lang === "en" 
        ? `✗ Error: ${err.message || "Invalid key"}`
        : `✗ Ошибка: ${err.message || "Неверный ключ"}`);
      setIsValid(false);
    }
  };

  const ui = {
    title: lang === "en" ? "API Key Settings" : "Настройки API ключа",
    description: lang === "en"
      ? "Save your API key for this provider. Key is stored locally in your browser."
      : "Сохраните ваш API ключ для этого провайдера. Ключ хранится локально в браузере.",
    placeholder: lang === "en"
      ? provider === 'gigachat'
        ? "Paste GigaChat Authorization Key (base64 encoded)"
        : "Paste your API key here"
      : provider === 'gigachat'
        ? "Вставьте Authorization Key GigaChat (в формате base64)"
        : "Вставьте ваш API ключ сюда",
    save: lang === "en" ? "Save" : "Сохранить",
    clear: lang === "en" ? "Clear" : "Удалить",
    cancel: lang === "en" ? "Cancel" : "Отмена",
    test: lang === "en" ? "Test Key" : "Проверить",
    saved: lang === "en" ? "✓ Saved" : "✓ Сохранено",
    note: lang === "en"
      ? "Your key is stored only in this browser and never sent to our servers."
      : "Ваш ключ хранится только в этом браузере и никогда не отправляется на наши серверы.",
    gigachatNote: lang === "en"
      ? "Format: base64(Client_ID:Client_Secret). Use 'echo -n \"ID:SECRET\" | base64' to generate."
      : "Формат: base64(Client_ID:Client_Secret). Используйте 'echo -n \"ID:SECRET\" | base64' для генерации.",
    testStatus: lang === "en"
      ? "Test your key before saving to ensure it works."
      : "Проверьте ключ перед сохранением, чтобы убедиться, что он работает.",
  };

  return (
    <div style={{ marginTop: 12 }}>
      {!isExpanded ? (
        <button
          type="button"
          className="button secondary"
          onClick={() => setIsExpanded(true)}
          style={{ fontSize: 13, padding: "6px 12px" }}
        >
          {isSaved ? (
            isValid ? `🔑 ${ui.title}` : `🔑 ${ui.title} (invalid)`
          ) : (
            `🔑 ${ui.title} (not set)`
          )}
        </button>
      ) : (
        <div style={{
          background: "var(--soft)",
          border: "1px solid var(--line)",
          borderRadius: 8,
          padding: 16,
          marginTop: 8
        }}>
          <h4 style={{ margin: "0 0 8px 0", fontSize: 14 }}>{ui.title}</h4>
          <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>{ui.description}</p>
          
          {provider === 'gigachat' && (
            <p style={{ 
              fontSize: 12, 
              marginBottom: 12,
              background: isValid ? '#d4edda' : '#f8d7da',
              border: '1px solid #c3e6cb',
              borderRadius: 6,
              padding: '8px 12px',
              color: isValid ? '#155724' : '#721c24'
            }}>
              {ui.gigachatNote}
            </p>
          )}
          
          <input
            type="password"
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
              if (provider === 'gigachat') {
                setIsValid(validateGigaChatKey(e.target.value));
              }
            }}
            placeholder={ui.placeholder}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid var(--line)",
              fontSize: 13,
              marginBottom: 12,
              boxSizing: "border-box"
            }}
          />

          {testStatus && (
            <div style={{ 
              marginBottom: 12, 
              padding: '8px 12px',
              borderRadius: 6,
              fontSize: 13,
              background: isValid ? '#d4edda' : '#fff3cd',
              border: '1px solid #c3e6cb',
              color: isValid ? '#155724' : '#856404'
            }}>
              {testStatus}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              className="button"
              onClick={handleSave}
              style={{ fontSize: 13, padding: "6px 12px" }}
            >
              {ui.save}
            </button>
            
            {provider === 'gigachat' && (
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
            
            <button
              type="button"
              className="button secondary"
              onClick={handleClear}
              style={{ fontSize: 13, padding: "6px 12px" }}
            >
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
                fontSize: 13
              }}
            >
              {ui.cancel}
            </button>

            {isSaved && (
              <span style={{ 
                color: isValid ? "var(--green)" : "var(--red)", 
                fontSize: 13 
              }}>
                {isValid ? ui.saved : "(invalid)"}
              </span>
            )}
          </div>

          <p className="muted" style={{ fontSize: 11, marginTop: 12 }}>{ui.note}</p>
          {provider === 'gigachat' && (
            <p className="muted" style={{ fontSize: 11 }}>{ui.testStatus}</p>
          )}
        </div>
      )}
    </div>
  );
}

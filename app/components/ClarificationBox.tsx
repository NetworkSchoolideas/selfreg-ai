"use client";

import type { ProviderId } from "@/lib/provider-registry";

interface ClarificationBoxProps {
  feedback: string;
  provider: ProviderId;
  lang: "ru" | "en";
  isPersisting?: boolean;
  onClearAndRetry: () => void;
  onSkip: () => void;
}

export function ClarificationBox({
  feedback,
  provider,
  lang,
  isPersisting = false,
  onClearAndRetry,
  onSkip,
}: ClarificationBoxProps) {
  const isMock = provider === "mock";

  return (
    <div className="clarification-box">
      <div className="clarification-header">
        {isMock
          ? (lang === "en" ? "Suggestion to answer better:" : "Подсказка, чтобы лучше ответить:")
          : (lang === "en" ? "AI recommendation to answer this question better:" : "Рекомендация ИИ, чтобы лучше ответить на этот вопрос:")}
      </div>
      <p>{feedback}</p>
      <div className="clarification-hint">
        {lang === "en"
          ? "You can re-answer using this suggestion, or press 'Skip this step' — only this step is skipped, the next stage will be a normal fresh question."
          : "Можешь ответить заново по рекомендации или нажать «Пропустить этот шаг» — пропущен будет только этот шаг, следующий этап начнётся с обычного вопроса."}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <button
          className="button secondary"
          type="button"
          onClick={onClearAndRetry}
          disabled={isPersisting}
        >
          {lang === "en" ? "Clear and retry" : "Очистить и ответить заново"}
        </button>
        <button
          className="button secondary"
          type="button"
          onClick={onSkip}
          disabled={isPersisting}
        >
          {lang === "en" ? "Skip this step" : "Пропустить этот шаг"}
        </button>
      </div>
    </div>
  );
}

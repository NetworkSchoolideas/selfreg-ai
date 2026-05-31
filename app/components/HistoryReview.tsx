"use client";

import { useState } from "react";
import type { ProviderId } from "@/lib/provider-registry";

interface PastSession {
  context: string;
  finalNote: string;
  updatedAt: string;
}

interface HistoryReviewProps {
  pastSessions: PastSession[];
  showHistory: boolean;
  historyAIComment: string | null;
  isLoadingHistoryAI: boolean;
  provider: ProviderId;
  lang: "ru" | "en";
  ui: {
    historyTitle: string;
    historyLatestLabel: string;
    historyAiButton: string;
    historyAiGenerating: string;
    historyAiPlaceholder: string;
    historyAiLabel: string;
    historyStartNew: string;
  };
  onStartNew: () => void;
  onGenerateInsight: (onSuccess: (comment: string) => void) => Promise<void>;
  onClearComment: () => void;
}

export function HistoryReview({
  pastSessions,
  showHistory,
  historyAIComment,
  isLoadingHistoryAI,
  provider,
  lang,
  ui,
  onStartNew,
  onGenerateInsight,
  onClearComment,
}: HistoryReviewProps) {
  const [localLoading, setLocalLoading] = useState(false);

  if (!showHistory || pastSessions.length === 0) return null;

  const handleGenerate = async () => {
    setLocalLoading(true);
    try {
      await onGenerateInsight((comment) => {
        // parent will update the comment
      });
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <div className="panel" style={{ marginBottom: 24, background: 'var(--soft)' }}>
      <h3 style={{ marginTop: 0 }}>{ui.historyTitle}</h3>
      <p className="muted" style={{ marginBottom: 12 }}>
        {lang === "en" ? "You have completed " : "Вы уже прошли "}
        <strong>{pastSessions.length}</strong>
        {lang === "en" 
          ? (pastSessions.length === 1 ? " session." : " sessions.")
          : (pastSessions.length === 1 ? " сессию." : pastSessions.length < 5 ? " сессии." : " сессий.")}
      </p>

      {/* Только последняя сессия */}
      {pastSessions[0] && (
        <div style={{ 
          border: '1px solid var(--line)', 
          borderRadius: 6, 
          padding: 12, 
          marginBottom: 16,
          background: 'white'
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', marginBottom: 4 }}>
            {ui.historyLatestLabel}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
            {new Date(pastSessions[0].updatedAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'ru-RU')}
          </div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>
            {pastSessions[0].context}
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.4 }}>
            {pastSessions[0].finalNote}
          </div>
        </div>
      )}

      {/* Кнопка LLM + заглушка */}
      <div style={{ marginTop: 12 }}>
        {provider !== 'mock' ? (
          <button 
            className="button" 
            disabled={isLoadingHistoryAI || localLoading}
            onClick={handleGenerate}
          >
            {(isLoadingHistoryAI || localLoading) ? ui.historyAiGenerating : ui.historyAiButton}
          </button>
        ) : (
          <div style={{ 
            padding: 12, 
            background: 'white', 
            border: '1px dashed var(--line)', 
            borderRadius: 6,
            fontSize: 13,
            color: 'var(--muted)'
          }}>
            {ui.historyAiPlaceholder}
          </div>
        )}
      </div>

      {/* LLM комментарий */}
      {historyAIComment && (
        <div style={{ 
          marginTop: 12, 
          padding: 12, 
          background: '#f0f7ff', 
          border: '1px solid var(--accent)', 
          borderRadius: 6,
          fontSize: 13,
          lineHeight: 1.45
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--accent)' }}>
            {ui.historyAiLabel}
          </div>
          <p style={{ margin: 0 }}>{historyAIComment}</p>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <button 
          className="button secondary" 
          onClick={() => {
            onClearComment();
            onStartNew();
          }}
        >
          {ui.historyStartNew}
        </button>
      </div>
    </div>
  );
}

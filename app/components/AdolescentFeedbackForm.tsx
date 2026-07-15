"use client";

import { useState } from "react";
import { ChildrenStorage } from "@/lib/children-storage";

interface AdolescentFeedbackFormProps {
  lang: "ru" | "en";
  childIdFromUrl: string | null;
  currentChildId: string | null;
  onSubmitted: () => void;
}

export function AdolescentFeedbackForm({
  lang,
  childIdFromUrl,
  currentChildId,
  onSubmitted,
}: AdolescentFeedbackFormProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const effectiveChildId = childIdFromUrl || currentChildId;

  const handleSubmit = async () => {
    if (!effectiveChildId || isSubmitting) return;

    const fb = {
      rating: rating || undefined,
      comment: comment.trim(),
      timestamp: new Date().toISOString(),
    };

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const saved = await ChildrenStorage.saveAdolescentFeedbackAsync(effectiveChildId, fb);
      if (!saved) {
        throw new Error("Feedback session is unavailable");
      }
      onSubmitted();
      setComment("");
      setRating(null);
    } catch {
      setSubmitError(
        lang === "en"
          ? "Could not save feedback. Please try again."
          : "Не удалось сохранить обратную связь. Попробуйте ещё раз.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ marginTop: 18, padding: 12, background: 'var(--soft)', border: '1px solid var(--line)', borderRadius: 6 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
        {lang === "en" ? "Feedback for your teacher / psychologist (optional)" : "Обратная связь для педагога / психолога (необязательно)"}
      </div>

      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          {lang === "en" ? "How useful was this session?" : "Насколько полезной получилась сессия?"}
        </span>
        <div style={{ display: 'flex', gap: 6, marginTop: 6, fontSize: 20 }}>
          {[1, 2, 3, 4, 5].map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setRating(r)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                color: (rating ?? 0) >= r ? '#f5c242' : '#ccc',
                transition: 'transform 0.1s'
              }}
              aria-label={`${r} stars`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        placeholder={lang === "en" ? "What was helpful? What could be better?" : "Что было полезно? Что можно улучшить?"}
        style={{ width: '100%', fontSize: 13, padding: 6, borderRadius: 4, border: '1px solid var(--line)' }}
      />

      <div style={{ marginTop: 8 }}>
        <button
          type="button"
          className="button"
          disabled={isSubmitting || (!comment.trim() && !rating)}
          onClick={() => void handleSubmit()}
        >
          {isSubmitting
            ? (lang === "en" ? "Saving..." : "Сохраняем...")
            : (lang === "en" ? "Send feedback to teacher" : "Отправить педагогу")}
        </button>
      </div>
      {submitError && (
        <p role="alert" style={{ fontSize: 12, color: "#b91c1c", marginTop: 8 }}>
          {submitError}
        </p>
      )}
      <p className="muted" style={{ fontSize: 11, marginTop: 6 }}>
        {lang === "en" ? "Your feedback will be visible to the teacher in the dashboard." : "Педагог увидит эту обратную связь в дашборде."}
      </p>
    </div>
  );
}

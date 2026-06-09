"use client";

interface ConsentModalProps {
  isOpen: boolean;
  onConsent: () => void;
  onDecline: () => void;
  lang: "ru" | "en";
}

export function ConsentModal({ isOpen, onConsent, onDecline, lang }: ConsentModalProps) {
  if (!isOpen) return null;

  const texts = {
    ru: {
      title: "Согласие на обработку данных",
      content: `
        Настоящим я даю своё согласие на обработку персональных данных в рамках проекта SelfReg AI.
        
        Данные, которые собираются:
        - Имя и класс участника
        - Ответы на вопросы в сессии саморегуляции
        - Временные метки и метаданные сессии
        
        Цель сбора данных:
        - Исследование модели саморегуляции подростков
        - Улучшение образовательного инструмента
        - Аналитика эффективности метода
        
        Ваши права:
        - Вы можете в любой момент запросить удаление своих данных
        - Данные не передаются третьим лицам без вашего согласия
        - Данные используются только в анонимизированном виде для исследований
        
        Оператор данных: Команда NLP-Core-Team
      `,
      consent: "Даю согласие",
      decline: "Отказаться",
      warning: "Без согласия вы можете продолжить только в режиме демонстрации без сохранения данных."
    },
    en: {
      title: "Data Processing Consent",
      content: `
        Hereby I give my consent to the processing of personal data within the SelfReg AI project.
        
        Data collected:
        - Participant name and class
        - Answers to self-regulation session questions
        - Session timestamps and metadata
        
        Purpose of data collection:
        - Research on adolescent self-regulation models
        - Improvement of the educational tool
        - Analytics on method effectiveness
        
        Your rights:
        - You can request deletion of your data at any time
        - Data is not shared with third parties without your consent
        - Data is used only in anonymized form for research
        
        Data Operator: NLP-Core-Team
      `,
      consent: "I consent",
      decline: "Decline",
      warning: "Without consent, you can continue only in demo mode without data saving."
    }
  };

  const t = texts[lang];

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        padding: 20,
      }}
      onClick={onDecline}
    >
      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: 32,
          maxWidth: 600,
          maxHeight: "80vh",
          overflow: "auto",
          position: "relative",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0, marginBottom: 16 }}>{t.title}</h2>
        
        <div
          style={{
            background: "#f9fafb",
            padding: 16,
            borderRadius: 8,
            marginBottom: 24,
            whiteSpace: "pre-line",
            lineHeight: 1.6,
            fontSize: 14,
          }}
        >
          {t.content}
        </div>
        
        <div
          style={{
            background: "#fef3c7",
            border: "1px solid #f59e0b",
            padding: 12,
            borderRadius: 6,
            marginBottom: 24,
            fontSize: 13,
            color: "#92400e",
          }}
        >
          {t.warning}
        </div>
        
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button
            onClick={onDecline}
            style={{
              padding: "10px 20px",
              borderRadius: 6,
              border: "1px solid #d1d5db",
              background: "white",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            {t.decline}
          </button>
          <button
            onClick={onConsent}
            style={{
              padding: "10px 20px",
              borderRadius: 6,
              border: "none",
              background: "#4f46e5",
              color: "white",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {t.consent}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: "ru" | "en";
  type: "adolescent" | "teacher";
}

function getContent(lang: "ru" | "en", type: "adolescent" | "teacher") {
  if (type === "adolescent") {
    return {
      title: lang === "en" ? "Welcome to SelfReg AI" : "Добро пожаловать в SelfReg AI",
      subtitle:
        lang === "en"
          ? "This is a self-regulation practice session. You will go through 5 stages to learn how to manage your goals and actions better."
          : "Это тренировочная сессия саморегуляции. Ты пройдешь 5 этапов, чтобы научиться лучше управлять своими целями и действиями.",
      steps: [
        {
          icon: "🎯",
          title: lang === "en" ? "Goal" : "Цель",
          text:
            lang === "en"
              ? "Set a goal for a real situation - study, project, sport, or a habit."
              : "Поставь цель для реальной ситуации - учеба, проект, спорт или привычка.",
        },
        {
          icon: "🏃",
          title: lang === "en" ? "Move to action" : "Переход к действию",
          text:
            lang === "en"
              ? "Plan concrete steps to achieve your goal."
              : "Спланируй конкретные шаги для достижения цели.",
        },
        {
          icon: "💬",
          title: lang === "en" ? "Feedback" : "Обратная связь",
          text:
            lang === "en"
              ? "Get AI feedback on your plan and thinking."
              : "Получи обратную связь от ИИ о твоем плане и рассуждениях.",
        },
        {
          icon: "🔍",
          title: lang === "en" ? "Comparison" : "Сравнение",
          text:
            lang === "en"
              ? "Compare your plan with recommendations."
              : "Сравни свой план с рекомендациями.",
        },
        {
          icon: "🔧",
          title: lang === "en" ? "Adjustment" : "Корректировка",
          text:
            lang === "en"
              ? "Adjust your approach based on feedback."
              : "Скорректируй свой подход на основе обратной связи.",
        },
      ],
      notes: [
        lang === "en"
          ? "💡 The AI may offer different support styles (Scenario A or B) - both are designed to help you reflect."
          : "💡 ИИ может предлагать разные стили поддержки (Сценарий A или B) - оба помогают задуматься.",
        lang === "en"
          ? '❓ If a question is unclear, click "Need clarification" - the AI will rephrase it.'
          : '❓ Если вопрос непонятен, нажми "Не понял вопрос" - ИИ переформулирует его.',
        lang === "en"
          ? '🔌 You can use the app without AI in Mock mode - just select "mock" as the provider.'
          : '🔌 Можно пользоваться приложением без ИИ в Mock-режиме - выбери "mock" как провайдера.',
      ],
      gotIt: lang === "en" ? "Got it, let's start!" : "Понятно, начнем!",
    };
  }

  return {
    title: lang === "en" ? "Welcome to the Teacher Dashboard" : "Добро пожаловать в панель педагога",
    subtitle:
      lang === "en"
        ? "This dashboard helps you monitor self-regulation sessions of your students. Here's what you can do:"
        : "Эта панель помогает отслеживать сессии саморегуляции учеников. Вот что можно делать:",
    steps: [
      {
        icon: "👥",
        title: lang === "en" ? "Add students" : "Добавление учеников",
        text:
          lang === "en"
            ? "Add students on the left panel. Each student gets a unique link to share with them."
            : "Добавляйте учеников на левой панели. Каждый ученик получает уникальную ссылку.",
      },
      {
        icon: "📊",
        title: lang === "en" ? "View analytics" : "Просмотр аналитики",
        text:
          lang === "en"
            ? "See class-wide statistics: scenario distribution, stage support, and student progress."
            : "Смотрите статистику по классу: распределение сценариев, поддержка этапов и прогресс учеников.",
      },
      {
        icon: "📋",
        title: lang === "en" ? "Session records" : "Записи сессий",
        text:
          lang === "en"
            ? "Each student's sessions show their progress through the 5 stages of self-regulation."
            : "Сессии каждого ученика показывают прогресс по 5 этапам саморегуляции.",
      },
      {
        icon: "🔄",
        title: lang === "en" ? "A/B scenarios" : "Сценарии A/B",
        text:
          lang === "en"
            ? "A/B scenarios show different AI support patterns - normal support vs pressure/self-attack support."
            : "Сценарии A/B показывают разные паттерны поддержки ИИ - обычная поддержка и давление/самоатака.",
      },
      {
        icon: "📤",
        title: lang === "en" ? "Export data" : "Экспорт данных",
        text:
          lang === "en"
            ? "Export session data to CSV for further analysis."
            : "Экспортируйте данные сессий в CSV для дальнейшего анализа.",
      },
    ],
    notes: [
      lang === "en"
        ? "💡 Students can use the app with or without AI - Mock mode is always available."
        : "💡 Ученики могут пользоваться приложением с ИИ или без него - Mock-режим всегда доступен.",
      lang === "en"
        ? "🔗 Share the student session link from the student's card so they can begin."
        : "🔗 Поделитесь ссылкой на сессию из карточки ученика, чтобы он мог начать работу.",
    ],
    gotIt: lang === "en" ? "Got it, let's go!" : "Понятно, поехали!",
  };
}

export function OnboardingModal({ isOpen, onClose, lang, type }: OnboardingModalProps) {
  if (!isOpen) return null;

  const content = getContent(lang, type);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(event) => event.stopPropagation()}
        style={{ maxWidth: 520 }}
      >
        <button onClick={onClose} className="modal-close">
          x
        </button>

        <h2 className="m-0 mb-8 fs-20">{content.title}</h2>
        <p className="m-0 mb-20 fs-14 c-muted" style={{ lineHeight: 1.5 }}>
          {content.subtitle}
        </p>

        <div className="onboarding-body">
          {content.steps.map((step, index) => (
            <div className="onboarding-step" key={index}>
              <div className="onboarding-step-icon">{step.icon}</div>
              <div className="onboarding-step-text">
                <div className="onboarding-step-title">{step.title}</div>
                <div>{step.text}</div>
              </div>
            </div>
          ))}
        </div>

        {content.notes.length > 0 && (
          <div className="mt-16" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {content.notes.map((note, index) => (
              <p key={index} className="m-0 fs-13 c-muted" style={{ lineHeight: 1.4 }}>
                {note}
              </p>
            ))}
          </div>
        )}

        <div className="onboarding-footer">
          <button className="button" onClick={onClose} style={{ padding: "10px 32px", fontSize: 15 }}>
            {content.gotIt}
          </button>
        </div>
      </div>
    </div>
  );
}

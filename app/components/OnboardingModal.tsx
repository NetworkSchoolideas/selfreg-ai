"use client";

import { useEffect, useRef } from "react";

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
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onEscape);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onEscape);
      previouslyFocused?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const content = getContent(lang, type);
  const disclosure = type === "adolescent"
    ? {
        title: lang === "en" ? "Before you start" : "Перед началом",
        items: lang === "en"
          ? [
              "This is a learning exercise for self-reflection, not therapy or emergency help.",
              "Your saved answers can be viewed by the teacher linked to your account.",
              "Do not enter passwords, access codes, or other secrets.",
              "If you are in danger, stop the exercise and contact a trusted adult or local emergency services.",
            ]
          : [
              "Это учебное упражнение для саморефлексии, а не терапия и не экстренная помощь.",
              "Сохранённые ответы может просматривать педагог, привязанный к вашему аккаунту.",
              "Не вводите пароли, коды доступа и другие секреты.",
              "Если вы в опасности, остановите упражнение и обратитесь к взрослому, которому доверяете, или в местные экстренные службы.",
            ],
      }
    : null;
  const notes = type === "adolescent"
    ? lang === "en"
      ? [
          "Choose Mock mode if you want to complete the exercise without an external AI service.",
          'If a question is unclear, use "Need clarification" to get a simpler prompt.',
          "For the demo, use a fictional learning situation and a pseudonym.",
        ]
      : [
          "Выберите Mock-режим, если хотите пройти упражнение без внешнего ИИ-сервиса.",
          'Если вопрос непонятен, нажмите «Не понял вопрос», чтобы получить более простую формулировку.',
          "Для демонстрации используйте вымышленную учебную ситуацию и псевдоним.",
        ]
    : content.notes;

  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable?.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="modal-content"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleDialogKeyDown}
        style={{ maxWidth: 520 }}
      >
        <button ref={closeButtonRef} onClick={onClose} className="modal-close" aria-label={lang === "en" ? "Close onboarding" : "Закрыть подсказку"}>
          x
        </button>

        <h2 id="onboarding-title" className="m-0 mb-8 fs-20">{content.title}</h2>
        <p className="m-0 mb-20 fs-14 c-muted" style={{ lineHeight: 1.5 }}>
          {content.subtitle}
        </p>

        {disclosure && (
          <section className="onboarding-disclosure" aria-labelledby="onboarding-disclosure-title">
            <h3 id="onboarding-disclosure-title">{disclosure.title}</h3>
            <ul>
              {disclosure.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>
        )}

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

        {notes.length > 0 && (
          <div className="mt-16" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {notes.map((note, index) => (
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

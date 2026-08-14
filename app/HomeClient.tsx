"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthButton } from "@/app/components/AuthButton";
import { LanguageToggle } from "@/app/components/LanguageToggle";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { normalizeAppLang, withLang } from "@/lib/app-i18n";

type GuideId = "student" | "teacher" | "api";
type HomeAction = { href: string; label: string; secondary?: boolean };

function ProviderMark({ label, tone }: { label: string; tone: "green" | "purple" }) {
  return (
    <span className={`home-provider-mark home-provider-mark-${tone}`} aria-hidden="true">
      <svg viewBox="0 0 32 32" focusable="false">
        <path d="M16 3.5c7 0 12.5 4.9 12.5 11 0 5.9-5.1 10.7-11.7 11L11 28.5l1.2-3.6C7.1 23.2 3.5 19.3 3.5 14.5c0-6.1 5.5-11 12.5-11Z" />
        <path className="home-provider-mark-line" d="M10 14.5h12M10 18.5h8" />
      </svg>
      <span>{label}</span>
    </span>
  );
}

const projectLandingUrl =
  process.env.NEXT_PUBLIC_PROJECT_LANDING_URL || "https://selfreg-ai-networkschool.vercel.app";

const contact = {
  ru: {
    name: "\u0421\u043c\u0438\u0440\u043d\u043e\u0432 \u0410\u043b\u0435\u043a\u0441\u0430\u043d\u0434\u0440 \u0414\u043c\u0438\u0442\u0440\u0438\u0435\u0432\u0438\u0447",
    institution: "\u041c\u043e\u0441\u043a\u043e\u0432\u0441\u043a\u0438\u0439 \u0433\u043e\u0440\u043e\u0434\u0441\u043a\u043e\u0439 \u043f\u0435\u0434\u0430\u0433\u043e\u0433\u0438\u0447\u0435\u0441\u043a\u0438\u0439 \u0443\u043d\u0438\u0432\u0435\u0440\u0441\u0438\u0442\u0435\u0442, \u041c\u043e\u0441\u043a\u0432\u0430, \u0420\u043e\u0441\u0441\u0438\u044f",
    email: "adsmirnov_1@edu.hse.ru",
  },
  en: {
    name: "Alexander Dmitrievich Smirnov",
    institution: "Moscow City University, Moscow, Russia",
    email: "adsmirnov_1@edu.hse.ru",
  },
};

export function HomeClient() {
  const searchParams = useSearchParams();
  const lang = normalizeAppLang(searchParams.get("lang"));
  const isEnglish = lang === "en";
  const [activeGuide, setActiveGuide] = useState<GuideId>("student");
  const { user, isLoading: isAuthLoading } = useSupabaseAuth();

  useEffect(() => {
    const hasAuthCode = searchParams.has("code");
    const hasOtpToken = searchParams.has("token_hash") && searchParams.has("type");
    const hasAuthError = searchParams.has("error");

    if (!hasAuthCode && !hasOtpToken && !hasAuthError) return;

    const callbackUrl = new URL("/auth/callback", window.location.origin);
    searchParams.forEach((value, key) => callbackUrl.searchParams.set(key, value));

    if (!callbackUrl.searchParams.has("role")) {
      const pendingRole = window.localStorage.getItem("selfreg_pending_role");
      if (pendingRole === "teacher" || pendingRole === "student") {
        callbackUrl.searchParams.set("role", pendingRole);
      }
    }

    if (!callbackUrl.searchParams.has("lang")) callbackUrl.searchParams.set("lang", lang);
    window.location.replace(callbackUrl.toString());
  }, [lang, searchParams]);

  const copy = isEnglish
    ? {
        eyebrow: "SelfReg AI",
        title: "Support for self-regulation during adolescence and early adulthood",
        lead: "SelfReg AI guides adolescents and young adults through five stages: setting a goal, moving to action, working with feedback, comparing the result with the goal, and adjusting the next step. AI is a temporary external scaffold, not a replacement for a teacher. A linked teacher can review sessions in read-only mode.",
        start: "Start a session",
        studentDashboard: "My dashboard",
        teacher: "Teacher dashboard",
        chooseRole: "Choose a role",
        teacherOnly: "The teacher dashboard is available only to teacher accounts.",
        studentOnly: "Student sessions are available only to student accounts.",
        privacy: "Do not enter passwords, access codes, or other secrets into the session.",
        visualGoal: "Goal",
        visualFeedback: "Feedback",
        visualAdjust: "Adjustment",
        guideTitle: "How the app works",
        guideTabsLabel: "Choose an instruction",
        guideStep: "Step",
        openGuide: "Instruction",
        providerDocs: "Compare provider options",
        providerPolicyTitle: "Free access, with an honest provider policy",
        providerPolicyLead: "SelfReg AI is open to changing provider conditions: we use free and freemium API access so a learner can try the practice with their own key. Limits and available models belong to each provider and can change, so the app checks a key before a live session.",
        providerPolicyNote: "Mock mode is always available without a key. A provider can be removed from the app if its free path stops being reproducible or user-friendly.",
        providerCards: {
          gigachat: { title: "GigaChat", text: "Supported with an Authorization Key and an individual freemium allowance. OAuth exchange stays on the server." },
          groq: { title: "Groq", text: "Supported as an advanced BYOK option with a free testing tier and selectable open-weight models." },
        },
        guides: {
          student: {
            tab: "Student",
            title: "Student: complete a self-regulation session",
            lead: "Use the five stages to work through a situation that matters to you. The completed result stays in your dashboard.",
            action: "Open student session",
            href: "/adolescent",
            steps: [
              ["01", "Choose one situation", "Start with a specific goal, task, project, conflict, or loss of motivation."],
              ["02", "Answer at your pace", "Write in your own words. If a question is unclear, use “Need clarification” to receive a simpler formulation."],
              ["03", "Continue or start again", "Back preserves the previous answer. Start over opens a clean new attempt. The completed session remains in your dashboard."],
            ],
          },
          teacher: {
            tab: "Teacher",
            title: "Teacher: connect, review, discuss",
            lead: "The student links their profile with the teacher code. Afterwards, the teacher can review all of that student's sessions and analytics in read-only mode.",
            action: "Open teacher dashboard",
            href: "/teacher",
            steps: [
              ["01", "Open your teacher dashboard", "Sign in or register as a teacher. Your personal teacher code is shown in the dashboard."],
              ["02", "Give the code to the student", "The student enters the code in their dashboard and links their profile to you. A profile can be linked to one teacher at a time."],
              ["03", "Review sessions together", "Use the full session history as a starting point for discussion. Removing a student only removes the teacher link and never deletes the student's sessions."],
            ],
          },
          api: {
            tab: "AI API key",
            title: "Enable live AI responses with your own key",
            lead: "The practice works without a key in Mock mode. For live responses, choose OpenRouter, Groq, or GigaChat and test your key before starting.",
            action: "Open API settings",
            href: "/settings",
            steps: [
              ["01", "Choose a provider", "OpenRouter is the simplest start; Groq provides open-weight models; GigaChat offers a large individual freemium allowance."],
              ["02", "Create your own key", "For OpenRouter or Groq, create a key in the official console. For GigaChat: create an API project, open API settings, choose Get key, and copy the one-time Authorization Key."],
              ["03", "Paste and check the key", "Open API settings, select the matching provider and model, then run the live check. Never put a key in a session answer."],
            ],
          },
        },
      }
    : {
        eyebrow: "SelfReg AI",
        title: "Поддержка саморегуляции в период взросления",
        lead: "SelfReg AI помогает подросткам и молодым взрослым пройти пять этапов: поставить цель, перейти к действию, работать с обратной связью, соотнести результат с целью и скорректировать следующий шаг. ИИ выступает временной внешней опорой, а не заменой педагога. После привязки профиля педагог видит сессии только для чтения.",
        start: "Начать сессию",
        studentDashboard: "Мой кабинет",
        teacher: "Кабинет педагога",
        chooseRole: "Выбрать роль",
        teacherOnly: "Кабинет педагога доступен только в аккаунте педагога.",
        studentOnly: "Сессии ученика доступны только в аккаунте ученика.",
        privacy: "Не вводите в сессию пароли, коды доступа и другие секреты.",
        visualGoal: "Цель",
        visualFeedback: "Обратная связь",
        visualAdjust: "Коррекция",
        guideTitle: "Как работает приложение",
        guideTabsLabel: "Выберите инструкцию",
        guideStep: "Шаг",
        openGuide: "Инструкция",
        providerDocs: "Сравнить варианты провайдеров",
        providerPolicyTitle: "Бесплатный доступ и честная политика провайдеров",
        providerPolicyLead: "SelfReg AI ориентируется на бесплатные и freemium-доступы к API, чтобы ученик мог попробовать практику со своим ключом. Лимиты и список моделей задают сами провайдеры и могут меняться, поэтому перед живой сессией приложение проверяет ключ.",
        providerPolicyNote: "Mock-режим всегда доступен без ключа. Если бесплатный путь провайдера перестаёт быть воспроизводимым или понятным пользователю, мы убираем его из приложения.",
        providerCards: {
          gigachat: { title: "GigaChat", text: "Поддерживается Authorization Key и freemium-лимит для индивидуальных проектов. Обмен токена выполняется только на сервере." },
          groq: { title: "Groq", text: "Поддерживается как расширенный BYOK-вариант с бесплатным тарифом для тестирования и выбором open-weight моделей." },
        },
        guides: {
          student: {
            tab: "Ученику",
            title: "Ученику: пройти сессию саморегуляции",
            lead: "Используйте пять этапов, чтобы разобрать важную для вас ситуацию. Завершённый результат сохраняется в личном кабинете.",
            action: "Открыть сессию ученика",
            href: "/adolescent",
            steps: [
              ["01", "Выберите одну ситуацию", "Начните с конкретной цели, задачи, проекта, конфликта или потери мотивации."],
              ["02", "Отвечайте в своём темпе", "Пишите своими словами. Если вопрос непонятен, нажмите «Не понял вопрос» — приложение даст более ясную формулировку."],
              ["03", "Продолжите или начните заново", "«Назад» сохраняет предыдущий ответ. «Начать заново» открывает чистую новую попытку. Завершённая сессия остаётся в личном кабинете."],
            ],
          },
          teacher: {
            tab: "Педагогу",
            title: "Педагогу: подключить, посмотреть, обсудить",
            lead: "Ученик привязывает свой профиль по коду педагога. После этого педагог видит все сессии и аналитику этого ученика только в режиме чтения.",
            action: "Открыть кабинет педагога",
            href: "/teacher",
            steps: [
              ["01", "Откройте кабинет педагога", "Войдите или зарегистрируйтесь как педагог. В кабинете будет показан ваш личный код педагога."],
              ["02", "Передайте код ученику", "Ученик вводит код в личном кабинете и привязывает профиль к вам. Один профиль можно привязать только к одному педагогу."],
              ["03", "Посмотрите сессии вместе", "Используйте полную историю сессий как основу для разговора. Удаление ученика из кабинета снимает связь, но не удаляет его сессии."],
            ],
          },
          api: {
            tab: "Ключ AI API",
            title: "Включить живые ответы ИИ со своим ключом",
            lead: "Практика работает без ключа в Mock-режиме. Для живых ответов выберите OpenRouter, Groq или GigaChat и проверьте ключ до начала.",
            action: "Открыть настройки API",
            href: "/settings",
            steps: [
              ["01", "Выберите провайдера", "OpenRouter — самый простой старт; Groq даёт open-weight модели; у GigaChat большой freemium-лимит для физлиц."],
              ["02", "Создайте свой ключ", "Для OpenRouter или Groq создайте ключ в официальном кабинете. Для GigaChat: создайте API-проект, откройте «Настройки API», нажмите «Получить ключ» и скопируйте одноразово показанный Authorization Key."],
              ["03", "Вставьте и проверьте ключ", "Откройте настройки API, выберите соответствующие провайдер и модель, затем запустите живую проверку. Не вводите ключ в ответы сессии."],
            ],
          },
        },
      };

  const activeGuideCopy = copy.guides[activeGuide];
  const activeContact = isEnglish ? contact.en : contact.ru;
  const userRole = user?.role ?? null;
  const personalSessionLabel = isEnglish ? "Personal session" : "\u041b\u0438\u0447\u043d\u0430\u044f \u0441\u0435\u0441\u0441\u0438\u044f";
  const heroActions: HomeAction[] = isAuthLoading
    ? []
    : userRole === "student"
      ? [
          { href: "/adolescent", label: copy.start },
          { href: "/student/dashboard", label: copy.studentDashboard, secondary: true },
        ]
      : userRole === "teacher"
        ? [
            { href: "/adolescent", label: personalSessionLabel },
            { href: "/teacher", label: copy.teacher, secondary: true },
          ]
        : user
          ? [{ href: "/role-selection", label: copy.chooseRole }]
          : [
              { href: "/adolescent", label: copy.start },
              { href: "/teacher", label: copy.teacher, secondary: true },
            ];
  const guideRoleNotice =
    userRole === "student" && activeGuide === "teacher"
      ? copy.teacherOnly
      : null;
  const guideActionLabel = userRole === "teacher" && activeGuide === "student"
    ? personalSessionLabel
    : activeGuideCopy.action;
  const support = isEnglish
    ? {
        title: "Project contact",
        text: "For project-related questions, use the contact details below.",
        landing: "Project landing",
      }
    : {
        title: "\u041a\u043e\u043d\u0442\u0430\u043a\u0442 \u043f\u0440\u043e\u0435\u043a\u0442\u0430",
        text: "\u041f\u043e \u0432\u043e\u043f\u0440\u043e\u0441\u0430\u043c \u043e \u043f\u0440\u043e\u0435\u043a\u0442\u0435 \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0439\u0442\u0435 \u043a\u043e\u043d\u0442\u0430\u043a\u0442\u043d\u044b\u0435 \u0434\u0430\u043d\u043d\u044b\u0435 \u043d\u0438\u0436\u0435.",
        landing: "\u041b\u0435\u043d\u0434\u0438\u043d\u0433 \u043f\u0440\u043e\u0435\u043a\u0442\u0430",
      };
  const contactHref = `mailto:${activeContact.email}`;

  return (
    <main className="shell app-home">
      <header className="topbar app-header home-topbar">
        <Link className="home-brand" href={withLang("/", lang)} aria-label="SelfReg AI">
          <span className="home-brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
          <span>SelfReg AI</span>
        </Link>
        <div className="action-row home-topbar-actions">
          <AuthButton lang={lang} />
          <LanguageToggle />
        </div>
      </header>

      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero-copy">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1 id="home-title">{copy.title}</h1>
          <p className="home-lead">{copy.lead}</p>
          {heroActions.length > 0 && (
            <div className="action-row home-hero-actions">
              {heroActions.map((action) => (
                <Link
                  key={action.href}
                  className={action.secondary ? "button secondary" : "button"}
                  href={withLang(action.href, lang)}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          )}
          <p className="home-privacy-note">{copy.privacy}</p>
        </div>
        <div className="home-hero-visual" aria-hidden="true">
          <div className="home-orbit home-orbit-one" />
          <div className="home-orbit home-orbit-two" />
          <div className="home-orbit home-orbit-three" />
          <div className="home-step home-step-one"><span>01</span><b>{copy.visualGoal}</b></div>
          <div className="home-step home-step-two"><span>03</span><b>{copy.visualFeedback}</b></div>
          <div className="home-step home-step-three"><span>05</span><b>{copy.visualAdjust}</b></div>
          <div className="home-visual-core">↗</div>
        </div>
      </section>

      <section className="home-guides" aria-labelledby="home-guides-title">
        <h2 id="home-guides-title">{copy.guideTitle}</h2>
        <div className="home-guide-tabs" role="tablist" aria-label={copy.guideTabsLabel}>
          {(Object.keys(copy.guides) as GuideId[]).map((guideId) => (
            <button
              key={guideId}
              id={`guide-tab-${guideId}`}
              className={activeGuide === guideId ? "is-active" : ""}
              role="tab"
              aria-selected={activeGuide === guideId}
              aria-controls={`guide-panel-${guideId}`}
              type="button"
              onClick={() => setActiveGuide(guideId)}
            >
              {copy.guides[guideId].tab}
            </button>
          ))}
        </div>
        <div id={`guide-panel-${activeGuide}`} className="home-guide-panel" role="tabpanel" aria-labelledby={`guide-tab-${activeGuide}`}>
          <div className="home-guide-intro">
            <p>{copy.openGuide}</p>
            <h3>{activeGuideCopy.title}</h3>
            <p>{activeGuideCopy.lead}</p>
          </div>
          <ol className="home-guide-steps">
          {activeGuideCopy.steps.map(([number, title, detail]) => (
            <li key={number}>
              <span aria-hidden="true">{number}</span>
              <div><p>{copy.guideStep} {number}</p><h4>{title}</h4><p>{detail}</p></div>
            </li>
          ))}
          </ol>
          {(activeGuide === "api" || !isAuthLoading) && (
            <div className="home-guide-actions">
              {guideRoleNotice ? (
                <p className="home-guide-role-note" role="status">{guideRoleNotice}</p>
              ) : (
                <Link className="button" href={withLang(activeGuideCopy.href, lang)}>{guideActionLabel}</Link>
              )}
              {activeGuide === "api" && <Link className="text-link" href={withLang("/settings", lang)}>{copy.providerDocs} →</Link>}
            </div>
          )}
        </div>
      </section>

      <section className="home-provider-policy" aria-labelledby="home-provider-policy-title">
        <div className="home-provider-policy-intro">
          <p className="eyebrow">API и доступность</p>
          <h2 id="home-provider-policy-title">{copy.providerPolicyTitle}</h2>
          <p>{copy.providerPolicyLead}</p>
        </div>
        <div className="home-provider-cards">
          <article className="home-provider-card">
            <ProviderMark label={copy.providerCards.gigachat.title} tone="green" />
            <p>{copy.providerCards.gigachat.text}</p>
          </article>
          <article className="home-provider-card">
            <ProviderMark label={copy.providerCards.groq.title} tone="purple" />
            <p>{copy.providerCards.groq.text}</p>
          </article>
        </div>
        <p className="home-provider-policy-note">{copy.providerPolicyNote}</p>
      </section>

      <section className="home-contact" aria-labelledby="home-contact-title">
        <div>
          <p className="eyebrow">SelfReg AI</p>
          <h2 id="home-contact-title">{support.title}</h2>
          <p>{support.text}</p>
        </div>
        <address className="home-contact-person">
          <strong>{activeContact.name}</strong>
          <span>{activeContact.institution}</span>
          <a className="home-contact-email" href={contactHref}>{activeContact.email}</a>
        </address>
      </section>

      <footer className="home-footer">
        <span>© {new Date().getFullYear()} SelfReg AI</span>
        <a href={projectLandingUrl} target="_blank" rel="noopener noreferrer">{support.landing} ↗</a>
      </footer>
    </main>
  );
}

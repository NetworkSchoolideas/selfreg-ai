"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthButton } from "@/app/components/AuthButton";
import { LanguageToggle } from "@/app/components/LanguageToggle";
import { normalizeAppLang, withLang } from "@/lib/app-i18n";

type GuideId = "student" | "teacher" | "api";

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
        title: "Self-regulation for a learning situation.",
        lead: "The student completes five stages: goal, move to action, feedback, comparison, and adjustment. Sessions stay in the student's dashboard. A student can link their profile to a teacher with a teacher code; then the teacher can review all sessions in read-only mode.",
        start: "Start a session",
        teacher: "Teacher dashboard",
        privacy: "Do not enter passwords, access codes, or other secrets into the session.",
        visualGoal: "Goal",
        visualFeedback: "Feedback",
        visualAdjust: "Adjustment",
        guideTitle: "How the app works",
        guideTabsLabel: "Choose an instruction",
        guideStep: "Step",
        openGuide: "Instruction",
        githubDocs: "GitHub instructions",
        guides: {
          student: {
            tab: "Student",
            title: "Student: complete a self-regulation session",
            lead: "The session has five stages: goal, move to action, feedback, comparison, and adjustment. The completed result stays in your dashboard.",
            action: "Open student session",
            href: "/adolescent",
            steps: [
              ["01", "Choose one learning situation", "Start with a specific task, answer, project, conflict, or loss of motivation."],
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
            tab: "GitHub API key",
            title: "GitHub Models: enable live AI responses",
            lead: "The practice works in mock mode. A personal GitHub token enables live responses in the current browser session.",
            action: "Open API settings",
            href: "/settings",
            steps: [
              ["01", "Create a GitHub token", "In GitHub, open Settings → Developer settings → Personal access tokens → Fine-grained tokens, then select Generate new token."],
              ["02", "Set the required permission", "Under Account permissions, set Models to Read-only. Set an expiry date, generate the token, and copy it once."],
              ["03", "Paste and check the key", "Open API settings in SelfReg AI, select GitHub Models, paste the token, and run the check. Never put a token in a session answer."],
            ],
          },
        },
      }
    : {
        eyebrow: "SelfReg AI",
        title: "Саморегуляция в учебной ситуации.",
        lead: "Ученик проходит пять этапов: цель, переход к действию, обратная связь, сличение и коррекция. Сессии сохраняются в личном кабинете ученика. Ученик может привязать профиль к педагогу по коду; после этого педагог видит все сессии только для чтения.",
        start: "Начать сессию",
        teacher: "Кабинет педагога",
        privacy: "Не вводите в сессию пароли, коды доступа и другие секреты.",
        visualGoal: "Цель",
        visualFeedback: "Обратная связь",
        visualAdjust: "Коррекция",
        guideTitle: "Как работает приложение",
        guideTabsLabel: "Выберите инструкцию",
        guideStep: "Шаг",
        openGuide: "Инструкция",
        githubDocs: "Инструкция GitHub",
        guides: {
          student: {
            tab: "Ученику",
            title: "Ученику: пройти сессию саморегуляции",
            lead: "Сессия состоит из пяти этапов: цель, переход к действию, обратная связь, сличение и коррекция. Завершённый результат сохраняется в личном кабинете.",
            action: "Открыть сессию ученика",
            href: "/adolescent",
            steps: [
              ["01", "Выберите учебную ситуацию", "Начните с конкретного задания, ответа, проекта, конфликта или потери мотивации."],
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
            tab: "Ключ GitHub API",
            title: "GitHub Models: включить живые ответы ИИ",
            lead: "Практика работает и в mock-режиме. Личный токен GitHub включает живые ответы ИИ в текущей сессии браузера.",
            action: "Открыть настройки API",
            href: "/settings",
            steps: [
              ["01", "Создайте токен на GitHub", "На GitHub откройте Settings → Developer settings → Personal access tokens → Fine-grained tokens и выберите Generate new token."],
              ["02", "Выдайте нужное разрешение", "В разделе Account permissions установите для Models значение Read-only. Задайте срок действия, создайте токен и скопируйте его один раз."],
              ["03", "Вставьте ключ и проверьте его", "Откройте настройки API в SelfReg AI, выберите GitHub Models, вставьте токен и запустите проверку. Не вводите токен в ответы сессии."],
            ],
          },
        },
      };

  const activeGuideCopy = copy.guides[activeGuide];
  const activeContact = isEnglish ? contact.en : contact.ru;
  const support = isEnglish
    ? {
        title: "Feedback and project contact",
        text: "Have a question, found a problem, or want to share what helped? Send a message to the project team.",
        action: "Write to the project team",
        landing: "Project landing",
      }
    : {
        title: "\u041e\u0431\u0440\u0430\u0442\u043d\u0430\u044f \u0441\u0432\u044f\u0437\u044c \u0438 \u043a\u043e\u043d\u0442\u0430\u043a\u0442 \u043f\u0440\u043e\u0435\u043a\u0442\u0430",
        text: "\u0415\u0441\u0442\u044c \u0432\u043e\u043f\u0440\u043e\u0441, \u043d\u0430\u0448\u043b\u0438 \u043f\u0440\u043e\u0431\u043b\u0435\u043c\u0443 \u0438\u043b\u0438 \u0445\u043e\u0442\u0438\u0442\u0435 \u0440\u0430\u0441\u0441\u043a\u0430\u0437\u0430\u0442\u044c, \u0447\u0442\u043e \u043f\u043e\u043c\u043e\u0433\u043b\u043e? \u041d\u0430\u043f\u0438\u0448\u0438\u0442\u0435 \u043a\u043e\u043c\u0430\u043d\u0434\u0435 \u043f\u0440\u043e\u0435\u043a\u0442\u0430.",
        action: "\u041d\u0430\u043f\u0438\u0441\u0430\u0442\u044c \u043a\u043e\u043c\u0430\u043d\u0434\u0435 \u043f\u0440\u043e\u0435\u043a\u0442\u0430",
        landing: "\u041b\u0435\u043d\u0434\u0438\u043d\u0433 \u043f\u0440\u043e\u0435\u043a\u0442\u0430",
      };

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
          <div className="action-row home-hero-actions">
            <Link className="button" href={withLang("/adolescent", lang)}>{copy.start}</Link>
            <Link className="button secondary" href={withLang("/teacher", lang)}>{copy.teacher}</Link>
          </div>
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
          <div className="home-guide-actions">
            <Link className="button" href={withLang(activeGuideCopy.href, lang)}>{activeGuideCopy.action}</Link>
            {activeGuide === "api" && <a className="text-link" href="https://docs.github.com/en/rest/models/inference" target="_blank" rel="noopener noreferrer">{copy.githubDocs} ↗</a>}
          </div>
        </div>
      </section>

      <section className="home-contact" aria-labelledby="home-contact-title">
        <div>
          <p className="eyebrow">SelfReg AI</p>
          <h2 id="home-contact-title">{support.title}</h2>
          <p>{support.text}</p>
          <a className="button" href={`mailto:${activeContact.email}?subject=${encodeURIComponent("SelfReg AI")}`}>
            {support.action}
          </a>
        </div>
        <address className="home-contact-person">
          <strong>{activeContact.name}</strong>
          <span>{activeContact.institution}</span>
          <a href={`mailto:${activeContact.email}`}>{activeContact.email}</a>
        </address>
      </section>

      <footer className="home-footer">
        <span>© {new Date().getFullYear()} SelfReg AI</span>
        <a href={projectLandingUrl} target="_blank" rel="noopener noreferrer">{support.landing} ↗</a>
      </footer>
    </main>
  );
}

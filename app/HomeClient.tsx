"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { AuthButton } from "@/app/components/AuthButton";
import { LanguageToggle } from "@/app/components/LanguageToggle";
import { normalizeAppLang, withLang } from "@/lib/app-i18n";

const projectLandingUrl =
  process.env.NEXT_PUBLIC_PROJECT_LANDING_URL || "https://selfreg-ai-networkschool.vercel.app";

const contact = {
  name: "Смирнов Александр Дмитриевич",
  institution: "Московский городской педагогический университет, Москва, Россия",
  email: "adsmirnov_1@edu.hse.ru",
};

export function HomeClient() {
  const searchParams = useSearchParams();
  const lang = normalizeAppLang(searchParams.get("lang"));
  const isEnglish = lang === "en";

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
        eyebrow: "A guided self-regulation practice",
        title: "Turn a difficult learning moment into one clear next step.",
        lead: "SelfReg AI gives adolescents a short, structured reflection cycle. Teachers can review only the sessions that students choose to connect.",
        start: "Start a session",
        teacher: "Teacher dashboard",
        studentTitle: "For a student",
        studentText: "Begin with a real or fictional learning situation. The five prompts help you make the next action concrete.",
        teacherTitle: "For a teacher",
        teacherText: "Connect a student with their teacher code, then use the dashboard to notice patterns and discuss a next step.",
        howItWorks: "How it works",
        guideTitle: "A clear start in three steps",
        apiTitle: "1. Connect AI only when you need it",
        apiSummary: "The app works in mock mode; for live AI, add a personal provider key in settings.",
        apiDetail: "The key is kept in the current browser session by default. Use GitHub Models for the recommended live setup, check that it works, then return to the session.",
        apiAction: "Open API settings",
        sessionTitle: "2. Complete the short cycle",
        sessionSummary: "Read the prompt, answer in your own words, and use clarification when a question is unclear.",
        sessionDetail: "You can go back, start again, or ask for clarification without losing the purpose of the exercise. At the end, your personal dashboard keeps the completed session.",
        teacherGuideTitle: "3. Connect, review, discuss",
        teacherGuideSummary: "A student decides whether to connect a session with a teacher using a teacher code.",
        teacherGuideDetail: "The teacher sees linked sessions and analytics in read-only mode. Removing a student from the dashboard only removes that connection; it does not delete the student's sessions.",
        supportTitle: "Feedback and project contact",
        supportText: "Have a question, found a problem, or want to share what helped? Send a message to the project team.",
        emailAction: "Write to the project team",
        landing: "Project landing",
        privacy: "Do not enter passwords, access codes, or other secrets into the session.",
      }
    : {
        eyebrow: "Практика саморегуляции с понятным маршрутом",
        title: "Превратите сложную учебную ситуацию в один ясный следующий шаг.",
        lead: "SelfReg AI проводит подростка через короткий цикл рефлексии. Педагог видит только те сессии, которые ученик решил подключить к нему.",
        start: "Начать сессию",
        teacher: "Кабинет педагога",
        studentTitle: "Для ученика",
        studentText: "Начните с реальной или вымышленной учебной ситуации. Пять вопросов помогут сделать следующий шаг конкретным.",
        teacherTitle: "Для педагога",
        teacherText: "Подключите ученика по коду педагога и используйте кабинет, чтобы заметить паттерны и обсудить следующий шаг.",
        howItWorks: "Как это работает",
        guideTitle: "Понятный старт за три шага",
        apiTitle: "1. Подключите ИИ, когда он нужен",
        apiSummary: "Приложение работает и в mock-режиме; для живого ИИ добавьте личный ключ провайдера в настройках.",
        apiDetail: "По умолчанию ключ хранится только в текущей сессии браузера. Для рабочего сценария используйте GitHub Models, проверьте ключ и вернитесь к сессии.",
        apiAction: "Открыть настройки API",
        sessionTitle: "2. Пройдите короткий цикл",
        sessionSummary: "Прочитайте вопрос, ответьте своими словами и запросите пояснение, если формулировка неясна.",
        sessionDetail: "Можно вернуться назад, начать заново или запросить пояснение, не теряя смысл упражнения. В конце завершённая сессия сохраняется в личном кабинете.",
        teacherGuideTitle: "3. Подключите, посмотрите, обсудите",
        teacherGuideSummary: "Ученик сам решает, подключать ли сессию к педагогу, используя код педагога.",
        teacherGuideDetail: "Педагог видит подключённые сессии и аналитику только для чтения. Удаление ученика из кабинета снимает связь, но не удаляет его сессии.",
        supportTitle: "Обратная связь и контакт проекта",
        supportText: "Есть вопрос, нашли проблему или хотите рассказать, что помогло? Напишите команде проекта.",
        emailAction: "Написать команде проекта",
        landing: "Лендинг проекта",
        privacy: "Не вводите в сессию пароли, коды доступа и другие секреты.",
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
          <div className="home-step home-step-one"><span>01</span><b>Goal</b></div>
          <div className="home-step home-step-two"><span>03</span><b>Reflect</b></div>
          <div className="home-step home-step-three"><span>05</span><b>Adjust</b></div>
          <div className="home-visual-core">↗</div>
        </div>
      </section>

      <section className="home-role-grid" aria-label={isEnglish ? "Choose your route" : "Выберите свой маршрут"}>
        <article className="home-role-card home-role-student">
          <span className="home-role-kicker">01</span>
          <h2>{copy.studentTitle}</h2>
          <p>{copy.studentText}</p>
          <Link href={withLang("/adolescent", lang)}>{copy.start} <span aria-hidden="true">→</span></Link>
        </article>
        <article className="home-role-card home-role-teacher">
          <span className="home-role-kicker">02</span>
          <h2>{copy.teacherTitle}</h2>
          <p>{copy.teacherText}</p>
          <Link href={withLang("/teacher", lang)}>{copy.teacher} <span aria-hidden="true">→</span></Link>
        </article>
      </section>

      <section className="home-guides" aria-labelledby="home-guides-title">
        <div className="home-section-heading">
          <p className="eyebrow">{copy.howItWorks}</p>
          <h2 id="home-guides-title">{copy.guideTitle}</h2>
        </div>
        <div className="home-guide-list">
          <details className="home-guide" open>
            <summary><span>01</span><strong>{copy.apiTitle}</strong><b aria-hidden="true">+</b></summary>
            <div><p>{copy.apiSummary}</p><p className="muted">{copy.apiDetail}</p><Link className="text-link" href={withLang("/settings", lang)}>{copy.apiAction} →</Link></div>
          </details>
          <details className="home-guide">
            <summary><span>02</span><strong>{copy.sessionTitle}</strong><b aria-hidden="true">+</b></summary>
            <div><p>{copy.sessionSummary}</p><p className="muted">{copy.sessionDetail}</p><Link className="text-link" href={withLang("/adolescent", lang)}>{copy.start} →</Link></div>
          </details>
          <details className="home-guide">
            <summary><span>03</span><strong>{copy.teacherGuideTitle}</strong><b aria-hidden="true">+</b></summary>
            <div><p>{copy.teacherGuideSummary}</p><p className="muted">{copy.teacherGuideDetail}</p><Link className="text-link" href={withLang("/teacher", lang)}>{copy.teacher} →</Link></div>
          </details>
        </div>
      </section>

      <section className="home-contact" aria-labelledby="home-contact-title">
        <div>
          <p className="eyebrow">SelfReg AI</p>
          <h2 id="home-contact-title">{copy.supportTitle}</h2>
          <p>{copy.supportText}</p>
          <a className="button" href={`mailto:${contact.email}?subject=${encodeURIComponent("SelfReg AI")}`}>{copy.emailAction}</a>
        </div>
        <address className="home-contact-person">
          <strong>{contact.name}</strong>
          <span>{contact.institution}</span>
          <a href={`mailto:${contact.email}`}>{contact.email}</a>
        </address>
      </section>

      <footer className="home-footer">
        <span>© {new Date().getFullYear()} SelfReg AI</span>
        <a href={projectLandingUrl} target="_blank" rel="noopener noreferrer">{copy.landing} ↗</a>
      </footer>
    </main>
  );
}

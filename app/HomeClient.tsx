"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthButton } from "@/app/components/AuthButton";
import { LanguageToggle } from "@/app/components/LanguageToggle";
import { normalizeAppLang, withLang } from "@/lib/app-i18n";

const projectLandingUrl =
  process.env.NEXT_PUBLIC_PROJECT_LANDING_URL || "https://selfreg-ai-networkschool.vercel.app";

const contact = {
  ru: {
    name: "Смирнов Александр Дмитриевич",
    institution: "Московский городской педагогический университет, Москва, Россия",
  },
  en: {
    name: "Alexander Dmitrievich Smirnov",
    institution: "Moscow City University, Moscow, Russia",
  },
  email: "adsmirnov_1@edu.hse.ru",
};

type GuideId = "student" | "teacher" | "api";

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
        visualGoal: "Name it",
        visualReflect: "Reflect",
        visualAdjust: "Act",
        guideTabsLabel: "Choose a guide",
        guideStep: "Step",
        openGuide: "Open guide",
        githubDocs: "GitHub instructions",
        guides: {
          student: {
            tab: "Student",
            title: "Student: complete a session without getting lost",
            lead: "You can try the practice before connecting it to a teacher. Your answers stay in your own dashboard.",
            action: "Open student session",
            href: "/adolescent",
            steps: [
              ["01", "Choose one learning situation", "Start with a concrete moment: an assignment, a difficult answer, a conflict, or a lack of motivation."],
              ["02", "Answer at your pace", "Write in your own words. If a prompt is confusing, select “I don’t understand the question” to see a clearer version."],
              ["03", "Use the controls with confidence", "Back preserves your previous answer; Start over creates a clean new attempt. At the end, open your dashboard to review the session."],
            ],
          },
          teacher: {
            tab: "Teacher",
            title: "Teacher: connect, notice patterns, discuss",
            lead: "The connection begins with the student. The dashboard is a read-only view of the sessions a student chooses to share.",
            action: "Open teacher dashboard",
            href: "/teacher",
            steps: [
              ["01", "Open your teacher dashboard", "Sign in or register as a teacher. Your personal teacher code is shown in the dashboard."],
              ["02", "Share the code with the student", "The student enters the code in their dashboard and decides whether to create the connection."],
              ["03", "Review, then discuss a next step", "Use the linked-session overview as a conversation prompt. Removing a student only hides the link in your dashboard; it never deletes the student’s sessions."],
            ],
          },
          api: {
            tab: "GitHub API key",
            title: "GitHub Models: add live AI in three careful steps",
            lead: "The practice is available in mock mode. A GitHub fine-grained token with the Models permission enables live responses for this browser session.",
            action: "Open API settings",
            href: "/settings",
            steps: [
              ["01", "Create a GitHub token", "In GitHub, open Settings → Developer settings → Personal access tokens → Fine-grained tokens, then choose Generate new token."],
              ["02", "Give it the minimum permission", "Under Account permissions, set Models to Read-only. Set an expiry date, generate the token, and copy it once."],
              ["03", "Paste and test it in SelfReg AI", "Open API settings, select GitHub Models, paste the token, and run the check. Never paste the token into a session answer or share it with another person."],
            ],
          },
        },
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
        visualGoal: "Назвать",
        visualReflect: "Осмыслить",
        visualAdjust: "Действовать",
        guideTabsLabel: "Выберите инструкцию",
        guideStep: "Шаг",
        openGuide: "Открыть инструкцию",
        githubDocs: "Инструкция GitHub",
        guides: {
          student: {
            tab: "Ученику",
            title: "Ученику: пройти сессию и не потеряться",
            lead: "Практику можно попробовать до подключения к педагогу. Ваши ответы остаются в вашем личном кабинете.",
            action: "Открыть сессию ученика",
            href: "/adolescent",
            steps: [
              ["01", "Выберите одну учебную ситуацию", "Начните с конкретного момента: задания, трудного ответа, конфликта или потери мотивации."],
              ["02", "Отвечайте в своём темпе", "Пишите своими словами. Если вопрос непонятен, нажмите «Не понял вопрос» — приложение покажет более ясную формулировку."],
              ["03", "Уверенно используйте кнопки", "«Назад» сохраняет предыдущий ответ, а «Начать заново» создаёт чистую попытку. В конце откройте кабинет и посмотрите сессию."],
            ],
          },
          teacher: {
            tab: "Педагогу",
            title: "Педагогу: подключить, заметить, обсудить",
            lead: "Подключение начинает ученик. Кабинет педагога — режим просмотра сессий, которыми ученик решил поделиться.",
            action: "Открыть кабинет педагога",
            href: "/teacher",
            steps: [
              ["01", "Откройте кабинет педагога", "Войдите или зарегистрируйтесь как педагог. В кабинете будет показан ваш личный код педагога."],
              ["02", "Передайте код ученику", "Ученик вводит код в своём кабинете и сам решает, создавать ли подключение."],
              ["03", "Посмотрите сессии и обсудите следующий шаг", "Используйте обзор как повод для разговора. «Убрать из моего кабинета» скрывает только связь у педагога и никогда не удаляет сессии ученика."],
            ],
          },
          api: {
            tab: "Ключ GitHub API",
            title: "GitHub Models: подключить живой ИИ за три понятных шага",
            lead: "Практика доступна и в mock-режиме. Для живых ответов в этой сессии браузера нужен fine-grained токен GitHub с разрешением Models.",
            action: "Открыть настройки API",
            href: "/settings",
            steps: [
              ["01", "Создайте токен на GitHub", "На GitHub откройте Settings → Developer settings → Personal access tokens → Fine-grained tokens и нажмите Generate new token."],
              ["02", "Выдайте только нужное разрешение", "В разделе Account permissions установите для Models значение Read-only. Задайте срок действия, создайте токен и скопируйте его один раз."],
              ["03", "Вставьте ключ и проверьте его в SelfReg AI", "Откройте настройки API, выберите GitHub Models, вставьте токен и запустите проверку. Не вставляйте токен в ответ сессии и не передавайте его другим людям."],
            ],
          },
        },
      };

  const activeGuideCopy = copy.guides[activeGuide];
  const activeContact = isEnglish ? contact.en : contact.ru;

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
          <div className="home-step home-step-two"><span>03</span><b>{copy.visualReflect}</b></div>
          <div className="home-step home-step-three"><span>05</span><b>{copy.visualAdjust}</b></div>
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
        <div
          id={`guide-panel-${activeGuide}`}
          className="home-guide-panel"
          role="tabpanel"
          aria-labelledby={`guide-tab-${activeGuide}`}
        >
          <div className="home-guide-intro">
            <p className="home-guide-tab-kicker">{copy.openGuide}</p>
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
            {activeGuide === "api" && (
              <a className="text-link" href="https://docs.github.com/en/rest/models/inference" target="_blank" rel="noopener noreferrer">{copy.githubDocs} ↗</a>
            )}
          </div>
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
          <strong>{activeContact.name}</strong>
          <span>{activeContact.institution}</span>
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

"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { LanguageToggle } from "@/app/components/LanguageToggle";
import { AuthButton } from "@/app/components/AuthButton";
import { ApiKeyManager } from "@/app/components/ApiKeyManager";
import { ClarificationBox } from "@/app/components/ClarificationBox";
import { AdolescentFeedbackForm } from "@/app/components/AdolescentFeedbackForm";
import { useAdolescentSession } from "./useAdolescentSession";
import { withLang, type AppLang } from "@/lib/app-i18n";
import { PROVIDERS, type ProviderId } from "@/lib/provider-registry";
import { ChildrenStorage } from "@/lib/children-storage";
import type { RecordItem, CompletedSession } from "@/types/session";
import { useSessionSubmit } from "@/hooks/useSessionSubmit";
import { useSessionHistory } from "@/hooks/useSessionHistory";
import { buildSessionSummary } from "@/lib/session-summary";

const STORAGE_KEY = "selfreg_demo_session";

/**
 * Главный компонент прототипа для подростка.
 *
 * После рефакторинга (~250 строк):
 * - Логика submit вынесена в useSessionSubmit
 * - История вынесена в useSessionHistory
 * - Состояние сессии в useAdolescentSession
 * - UI текст локализован через useUiText
 */
export function AdolescentPrototype() {
  const searchParams = useSearchParams();
  const lang = (searchParams.get("lang") === "en" ? "en" : "ru") as AppLang;
  const childIdFromUrl = searchParams.get("childId");
  const ui = useUiText(lang);
  const initialContext = lang === "en" ? "study project" : "учебный проект";

  // Core session state via hook
  const session = useAdolescentSession({ initialContext, lang });
  const {
    context, setContext, stageId, stage, records, finalNote,
    lastClarificationFeedback, setLastClarificationFeedback,
    answer, updateAnswer, pendingHistoryInsight, setPendingHistoryInsight,
    currentQuestion, isCompleted, completedStages, stageCount,
    addRecordAndAdvance, skipClarification, resetSession,
    suppressClarifyForNextStage, setSuppressClarifyForNextStage
  } = session;

  // Provider and model state
  const [provider, setProvider] = useState<ProviderId>("openrouter");
  const [model, setModel] = useState("openrouter/free");
  const [userApiKey, setUserApiKey] = useState("");

  // Registration state
  const [currentChildName, setCurrentChildName] = useState<string | null>(null);
  const [currentChildId, setCurrentChildId] = useState<string | null>(null);
  const [participantName, setParticipantName] = useState("");
  const [participantClass, setParticipantClass] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);

  // UI-only state
  const [showHistory, setShowHistory] = useState(true);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [justClearedClarify, setJustClearedClarify] = useState(false);

  // Load child info from URL on mount
  useEffect(() => {
    if (childIdFromUrl) {
      const child = ChildrenStorage.getChild(childIdFromUrl);
      if (child) {
        const sessionsCount = child.sessions?.length || 0;
        const name = sessionsCount > 0 ? `${child.name} (${sessionsCount})` : child.name;
        setCurrentChildName(name); // eslint-disable-line react-hooks/set-state-in-effect
        setCurrentChildId(childIdFromUrl); // eslint-disable-line react-hooks/set-state-in-effect
        setIsRegistered(true); // eslint-disable-line react-hooks/set-state-in-effect
      }
    }
  }, [childIdFromUrl]);

  // Restore pending history insight after refresh
  useEffect(() => {
    const effectiveId = childIdFromUrl || currentChildId;
    if (effectiveId && !pendingHistoryInsight) {
      try {
        const saved = sessionStorage.getItem(`history_insight_${effectiveId}`);
        if (saved) {
          setPendingHistoryInsight(saved);
          sessionStorage.removeItem(`history_insight_${effectiveId}`);
        }
      } catch {}
    }
  }, [childIdFromUrl, currentChildId, pendingHistoryInsight, setPendingHistoryInsight]);

  // History hook
  const { pastSessions, historyAIComment, isLoadingHistoryAI, generateHistoryInsight } = useSessionHistory({
    childId: currentChildId,
    lang,
    provider,
    model,
    userApiKey,
  });

  // Submit hook
  const [providerStatus, setProviderStatus] = useState(ui.mockStatus);
  const { isSending, answerQualityWarning, submitAnswer, setAnswerQualityWarning } = useSessionSubmit({
    context, stageId, stageTitle: stage.title, currentQuestion, records, finalNote, lang,
    provider, model, userApiKey, currentChildId, pendingHistoryInsight,
    addRecordAndAdvance,
    setFinalNote: session.setFinalNote,
    setLastClarificationFeedback,
    setSuppressClarifyForNextStage,
    setProviderStatus,
  });

  // Progress
  const progress = isCompleted ? 100 : Math.min(100, Math.round((completedStages / stageCount) * 100));

  // Registration handler
  const handleRegister = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const fio = participantName.trim();
    const klass = participantClass.trim();
    if (!fio || !klass) return;

    const anonId = generateAnonId(fio, klass);
    ChildrenStorage.addChildWithRealData(anonId, fio, klass);
    setCurrentChildId(anonId);
    setCurrentChildName(`${fio} (${klass})`);
    setIsRegistered(true);
  }, [participantName, participantClass]);

  // Restart handler
  const handleRestart = useCallback(() => {
    resetSession();
    setShowHistory(true);
    setFeedbackSubmitted(false);
    setSuppressClarifyForNextStage(false);
    setAnswerQualityWarning(null);
    setProviderStatus(ui.mockStatus);
    window.localStorage.removeItem(STORAGE_KEY);
  }, [resetSession, setAnswerQualityWarning, setProviderStatus, ui.mockStatus]);

  // Provider change handler
  const handleProviderChange = useCallback((nextProvider: ProviderId) => {
    setProvider(nextProvider);
    // Set default model based on provider
    if (nextProvider === "gigachat") setModel("GigaChat");
    else if (nextProvider === "openrouter") setModel("openrouter/free");
    else if (nextProvider === "github-models") setModel("openai/gpt-4o-mini");
    else if (nextProvider === "vercel-gateway") setModel("openai/gpt-oss-120b");
    else setModel("local-mock");
    
    setProviderStatus(nextProvider === "mock" ? ui.mockStatus : `${nextProvider}: ready`);
  }, [setProviderStatus, ui.mockStatus]);

  // Skip clarification handler
  const handleSkipClarification = useCallback(async () => {
    if (!lastClarificationFeedback) return;
    const adv = skipClarification(answer, currentQuestion, stage.title);
    if (adv?.completed && !finalNote) {
      const note = buildSessionSummary(context, adv.nextRecords, lang);
      session.setFinalNote(note);
    }
  }, [lastClarificationFeedback, skipClarification, answer, currentQuestion, stage.title, finalNote, context, lang, session.setFinalNote, setSuppressClarifyForNextStage]);

  // Generate history insight handler
  const handleGenerateInsight = useCallback(async () => {
    await generateHistoryInsight();
  }, [generateHistoryInsight]);

  // Start new session after history review
  const handleStartNew = useCallback(() => {
    if (historyAIComment) {
      setPendingHistoryInsight(historyAIComment);
      const effectiveId = childIdFromUrl || currentChildId;
      if (effectiveId) {
        try {
          sessionStorage.setItem(`history_insight_${effectiveId}`, historyAIComment);
        } catch {}
      }
    }
    setShowHistory(false);
  }, [historyAIComment, childIdFromUrl, currentChildId, setPendingHistoryInsight]);

  // Handle form submit
  const handleSubmit = useCallback(async () => {
    const result = await submitAnswer(answer, suppressClarifyForNextStage);
    if (result.clarificationNeeded && result.clarifyFeedback) {
      setLastClarificationFeedback(result.clarifyFeedback);
    }
  }, [submitAnswer, answer, suppressClarifyForNextStage, setLastClarificationFeedback]);

  return (
    <main className="shell">
      <div className="topbar app-header">
        <div>
          <p className="eyebrow">{ui.eyebrow}</p>
          <h1>{ui.title}</h1>
          <p className="muted">{ui.intro}</p>
        </div>
        <div className="action-row">
          <AuthButton lang={lang} />
          <LanguageToggle />
          <Link className="button secondary" href={withLang("/", lang)}>{ui.home}</Link>
          <Link className="button secondary" href={withLang("/teacher", lang)}>{ui.teacher}</Link>
        </div>
      </div>

      <section className="panel instruction">
        <h2>{ui.howTitle}</h2>
        <p>{ui.howText}</p>
      </section>

      <section className="prototype-layout">
        <div className="panel chat-panel">
          {/* Provider box */}
          <div className="provider-box">
            <div className="provider-row">
              <label className="field compact">
                <span>{ui.provider}</span>
                <select value={provider} onChange={(e) => handleProviderChange(e.target.value as ProviderId)}>
                  <option value="mock">Mock</option>
                  <option value="gigachat">GigaChat (Direct)</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="github-models">GitHub Models</option>
                  <option value="vercel-gateway">Vercel AI Gateway</option>
                </select>
              </label>
              <label className="field compact">
                <span>{ui.model}</span>
                <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="GigaChat, openai/gpt-4o-mini" />
              </label>
            </div>

            {/* API Key Manager - persistent per user per provider */}
            <ApiKeyManager
              lang={lang}
              provider={provider}
              onKeyChange={(savedKey) => setUserApiKey(savedKey)}
            />

            <p className="muted small-text">{providerStatus}</p>
          </div>

          {/* Registration form */}
          {!isRegistered && !childIdFromUrl && (
            <div className="panel" style={{ marginBottom: 24 }}>
              <h3 style={{ marginTop: 0 }}>{ui.registrationTitle}</h3>
              <p className="muted" style={{ marginBottom: 16 }}>{ui.registrationText}</p>
              <form onSubmit={handleRegister}>
                <label className="field">
                  <span>{ui.fullName}</span>
                  <input type="text" value={participantName} onChange={(e) => setParticipantName(e.target.value)} placeholder={ui.fullNamePlaceholder} required />
                </label>
                <label className="field">
                  <span>{ui.classLabel}</span>
                  <input type="text" value={participantClass} onChange={(e) => setParticipantClass(e.target.value)} placeholder={ui.classPlaceholder} required />
                </label>
                <div className="action-row" style={{ marginTop: 12 }}>
                  <button type="submit" className="button">{ui.startSession}</button>
                </div>
              </form>
            </div>
          )}

          {/* History review */}
          {(isRegistered || childIdFromUrl) && pastSessions.length > 0 && showHistory && (
            <HistoryReviewPanel
              ui={ui}
              pastSessions={pastSessions}
              provider={provider}
              model={model}
              userApiKey={userApiKey}
              historyAIComment={historyAIComment}
              isLoadingHistoryAI={isLoadingHistoryAI}
              onGenerateInsight={handleGenerateInsight}
              onStartNew={handleStartNew}
              lang={lang}
            />
          )}

          {/* Main session content */}
          {(isRegistered || childIdFromUrl) && (!showHistory || pastSessions.length === 0) && (
            <>
              <label className="field">
                <span>{ui.context}</span>
                <input value={context} onChange={(e) => setContext(e.target.value)} placeholder={ui.contextPlaceholder} />
              </label>

              <div className="progress-line" aria-label={`Progress ${progress}%`}>
                <span style={{ width: `${progress}%` }} />
              </div>

              <div className="stage-pill">{lang === "en" ? `Step ${stage.id} of 5` : `Шаг ${stage.id} из 5`}: {stage.title}</div>

              {currentChildName && (
                <div style={{ background: 'var(--soft)', border: '1px solid var(--line)', borderRadius: 6, padding: '6px 10px', fontSize: 13, marginBottom: 12 }}>
                  👤 Сессия для: <strong>{currentChildName}</strong>
                </div>
              )}

              {isCompleted ? (
                <CompletionView ui={ui} finalNote={finalNote} onRestart={handleRestart} lang={lang} childIdFromUrl={childIdFromUrl} feedbackSubmitted={feedbackSubmitted} onFeedbackSubmitted={() => setFeedbackSubmitted(true)} />
              ) : (
                <SessionForm
                  ui={ui}
                  currentQuestion={currentQuestion}
                  answer={answer}
                  updateAnswer={updateAnswer}
                  lastClarificationFeedback={lastClarificationFeedback}
                  lang={lang}
                  provider={provider}
                  isSending={isSending}
                  answerQualityWarning={answerQualityWarning}
                  justClearedClarify={justClearedClarify}
                  onClearAndRetry={() => { setLastClarificationFeedback(null); updateAnswer(""); setSuppressClarifyForNextStage(false); setJustClearedClarify(true); setTimeout(() => setJustClearedClarify(false), 4000); }}
                  onSkip={handleSkipClarification}
                  onSubmit={handleSubmit}
                  onRestart={handleRestart}
                />
              )}
            </>
          )}
        </div>

        <aside className="panel">
          <h2>{ui.collected}</h2>
          {records.length === 0 ? (
            <p className="muted">{ui.empty}</p>
          ) : (
            <div className="record-list">
              {records.map((item, index) => (
                <article className="record" key={`${item.stageId}-${index}`}>
                  <div className="record-head">
                    <strong>{item.stageTitle}</strong>
                    <span>{item.scenario}</span>
                  </div>
                  <p>{item.feedback}</p>
                </article>
              ))}
            </div>
          )}
          {finalNote && <div className="final-note"><h3>{ui.result}</h3><p>{finalNote}</p></div>}
        </aside>
      </section>
    </main>
  );
}

// ========== UI Text Hook ==========

function useUiText(lang: "ru" | "en") {
  return {
    eyebrow: lang === "en" ? "Prototype for the adolescent" : "Прототип для подростка",
    title: lang === "en" ? "Short self-regulation cycle" : "Короткий цикл саморегуляции",
    intro: lang === "en" ? "In 5-7 minutes choose a real situation, move through five steps, and get a clear recommendation." : "За 5-7 минут выбери реальную ситуацию, пройди пять шагов и получи понятную рекомендацию.",
    howTitle: lang === "en" ? "How to use it" : "Как пользоваться",
    howText: lang === "en" ? "Write about a situation where you want to cope better: study, project, sport, creativity, communication, or a habit." : "Напиши о ситуации, где хочешь справляться лучше: учеба, проект, спорт, творчество, общение или привычка.",
    home: lang === "en" ? "Home" : "Главная",
    teacher: lang === "en" ? "Teacher view" : "Педагогу",
    provider: lang === "en" ? "AI provider" : "ИИ-провайдер",
    model: lang === "en" ? "Model" : "Модель",
    key: lang === "en" ? "One-time API key" : "API-ключ",
    keyPlaceholder: lang === "en" ? "Not needed for mock" : "Для mock не нужен",
    context: lang === "en" ? "Context" : "Контекст",
    contextPlaceholder: lang === "en" ? "e.g.: exam, project" : "например: экзамен, проект",
    answerLabel: lang === "en" ? "Your answer" : "Твой ответ",
    answerPlaceholder: lang === "en" ? "Write 1-3 sentences" : "Напиши 1-3 предложения",
    submit: lang === "en" ? "Submit" : "Ответить",
    sending: lang === "en" ? "Waiting for AI..." : "Жду ответ ИИ...",
    restart: lang === "en" ? "Start over" : "Начать заново",
    doneTitle: lang === "en" ? "Session completed" : "Сессия завершена",
    doneText: lang === "en" ? "Answers saved. You can open the dashboard or run the cycle again." : "Ответы сохранены. Можно открыть дашборд или пройти цикл заново.",
    collected: lang === "en" ? "Collected" : "Собрано",
    empty: lang === "en" ? "No answers yet." : "Пока нет ответов.",
    result: lang === "en" ? "Summary" : "Итог",
    registrationTitle: lang === "en" ? "Session registration" : "Регистрация сессии",
    registrationText: lang === "en" ? "Enter your name so the teacher can see your results." : "Введи имя, чтобы педагог увидел результаты.",
    fullName: lang === "en" ? "Full name" : "ФИО",
    fullNamePlaceholder: lang === "en" ? "Ivanov Ivan" : "Иванов Иван",
    classLabel: lang === "en" ? "Class" : "Класс",
    classPlaceholder: lang === "en" ? "9A" : "9А",
    startSession: lang === "en" ? "Start" : "Начать",
    mockStatus: lang === "en" ? "Mock mode: no external key needed" : "Mock-режим: ключ не нужен",
    historyTitle: lang === "en" ? "Your history" : "Ваша история",
    historyLatestLabel: lang === "en" ? "Latest session" : "Последняя сессия",
    historyAiButton: lang === "en" ? "Get AI comment" : "Получить комментарий от ИИ",
    historyAiGenerating: lang === "en" ? "Generating..." : "Генерирую...",
    historyAiLabel: lang === "en" ? "AI Insight:" : "Комментарий ИИ:",
    historyStartNew: lang === "en" ? "Start new session" : "Начать новую сессию",
  };
}

function generateAnonId(fio: string, klass: string): string {
  const normalized = `${fio.trim().toLowerCase()}|${klass.trim().toLowerCase()}`;
  let hash = 5381;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash * 33) ^ normalized.charCodeAt(i);
  }
  return 'id_' + (hash >>> 0).toString(36);
}

// ========== Sub-components ==========

function HistoryReviewPanel({
  ui, pastSessions, provider, historyAIComment, isLoadingHistoryAI,
  onGenerateInsight, onStartNew, lang
}: {
  ui: ReturnType<typeof useUiText>;
  pastSessions: CompletedSession[];
  provider: ProviderId;
  model?: string;
  userApiKey?: string;
  historyAIComment: string | null;
  isLoadingHistoryAI: boolean;
  onGenerateInsight: () => Promise<void>;
  onStartNew: () => void;
  lang: AppLang;
}) {
  return (
    <div className="panel" style={{ marginBottom: 24, background: 'var(--soft)' }}>
      <h3 style={{ marginTop: 0 }}>{ui.historyTitle}</h3>
      <p className="muted" style={{ marginBottom: 12 }}>
        {lang === "en" ? "Completed " : "Пройдено "}<strong>{pastSessions.length}</strong>
        {lang === "en" ? (pastSessions.length === 1 ? " session" : " sessions") : pastSessions.length === 1 ? " сессия" : pastSessions.length < 5 ? " сессии" : " сессий"}
      </p>

      {pastSessions[0] && (
        <div style={{ border: '1px solid var(--line)', borderRadius: 6, padding: 12, marginBottom: 16, background: 'white' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', marginBottom: 4 }}>{ui.historyLatestLabel}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{new Date(pastSessions[0].updatedAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'ru-RU')}</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>{pastSessions[0].context}</div>
          <div style={{ fontSize: 13, lineHeight: 1.4 }}>{pastSessions[0].finalNote}</div>
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        {provider !== 'mock' ? (
          <button className="button" disabled={isLoadingHistoryAI} onClick={onGenerateInsight}>
            {isLoadingHistoryAI ? ui.historyAiGenerating : ui.historyAiButton}
          </button>
        ) : (
          <div style={{ padding: 12, background: 'white', border: '1px dashed var(--line)', borderRadius: 6, fontSize: 13, color: 'var(--muted)' }}>
            {lang === "en" ? "Connect a provider to get AI insights" : "Подключите провайдера для AI-комментариев"}
          </div>
        )}
      </div>

      {historyAIComment && (
        <div style={{ marginTop: 12, padding: 12, background: '#f0f7ff', border: '1px solid var(--accent)', borderRadius: 6, fontSize: 13, lineHeight: 1.45 }}>
          <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--accent)' }}>{ui.historyAiLabel}</div>
          <p style={{ margin: 0 }}>{historyAIComment}</p>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <button className="button secondary" onClick={onStartNew}>{ui.historyStartNew}</button>
      </div>
    </div>
  );
}

function CompletionView({
  ui, finalNote, onRestart, lang, childIdFromUrl, feedbackSubmitted, onFeedbackSubmitted
}: {
  ui: ReturnType<typeof useUiText>;
  finalNote: string;
  onRestart: () => void;
  lang: AppLang;
  childIdFromUrl: string | null;
  feedbackSubmitted: boolean;
  onFeedbackSubmitted: () => void;
}) {
  return (
    <div className="final-note">
      <h3>{ui.doneTitle}</h3>
      <p>{finalNote}</p>
      <p className="muted">{ui.doneText}</p>
      <div className="action-row" style={{ marginTop: 16 }}>
        <button className="button secondary" type="button" onClick={onRestart}>{ui.restart}</button>
      </div>
      {childIdFromUrl ? (
        <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>{lang === "en" ? "Results saved for teacher." : "Результаты сохранены для педагога."}</p>
      ) : (
        <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>{lang === "en" ? "You can start over anytime." : "Можно начать заново в любое время."}</p>
      )}
      {!feedbackSubmitted && childIdFromUrl && <AdolescentFeedbackForm lang={lang} childIdFromUrl={childIdFromUrl} currentChildId={null} onSubmitted={onFeedbackSubmitted} />}
      {feedbackSubmitted && <p style={{ fontSize: 13, color: 'var(--accent)', marginTop: 8 }}>{lang === "en" ? "Feedback saved." : "Обратная связь сохранена."}</p>}
    </div>
  );
}

function SessionForm({
  ui, currentQuestion, answer, updateAnswer, lastClarificationFeedback, lang, provider, isSending,
  answerQualityWarning, justClearedClarify, onClearAndRetry, onSkip, onSubmit, onRestart
}: {
  ui: ReturnType<typeof useUiText>;
  currentQuestion: string;
  answer: string;
  updateAnswer: (v: string) => void;
  lastClarificationFeedback: string | null;
  lang: AppLang;
  provider: ProviderId;
  isSending: boolean;
  answerQualityWarning: string | null;
  justClearedClarify: boolean;
  onClearAndRetry: () => void;
  onSkip: () => void;
  onSubmit: () => Promise<void>;
  onRestart: () => void;
}) {
  return (
    <>
      <div className="question-box"><p>{currentQuestion}</p></div>

      {lastClarificationFeedback && (
        <ClarificationBox
          feedback={lastClarificationFeedback}
          provider={provider}
          lang={lang}
          onClearAndRetry={onClearAndRetry}
          onSkip={onSkip}
        />
      )}

      <label className="field">
        <span>{ui.answerLabel}</span>
        <textarea value={answer} onChange={(e) => { updateAnswer(e.target.value); if (answerQualityWarning) updateAnswer(e.target.value); }} rows={5} placeholder={ui.answerPlaceholder} />
      </label>

      {answerQualityWarning && (
        <div style={{ background: '#fff8e1', border: '1px solid #f0d36f', borderRadius: 6, padding: '8px 12px', fontSize: 13, marginBottom: 8, color: '#664e03' }}>
          {answerQualityWarning}
        </div>
      )}

      {justClearedClarify && (
        <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 8 }}>
          {lang === "en" ? "Recommendation cleared. Write your answer and submit." : "Рекомендация убрана. Напиши ответ и нажми «Ответить»."}
        </div>
      )}

      <div className="action-row">
        <button className="button" type="button" onClick={onSubmit} disabled={isSending} aria-busy={isSending}>
          {isSending ? ui.sending : ui.submit}
        </button>
        <button className="button secondary" type="button" onClick={onRestart}>{ui.restart}</button>
      </div>
    </>
  );
}

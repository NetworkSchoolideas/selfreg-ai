import type { Session, RecordItem } from "@/lib/children-storage";
import type { SessionStatus } from "@/types/session";
import { inferRecordEventType } from "@/lib/session-helpers";
import { reduceFlowState } from "@/lib/selfreg-flow-machine";
import type { AppLang } from "@/lib/app-i18n";

export function getScenarioDistribution(sessions: Session[]) {
  const allRecords = sessions.flatMap((session) => session.records);
  const supportRecords = allRecords.filter((record) => {
    const eventType = inferRecordEventType(record);
    return eventType === "answer" || eventType === "skip";
  });
  const total = supportRecords.length || 1;
  const a = supportRecords.filter((record) => record.scenario === "A").length;
  const b = supportRecords.filter((record) => record.scenario === "B").length;
  const clarify = allRecords.filter((record) => inferRecordEventType(record) === "clarify_request").length;
  const skipped = supportRecords.filter((record) => record.scenario === "skipped").length;

  const nonSkipped = total - skipped;
  const base = nonSkipped || 1;

  return {
    a: Math.round((a / base) * 100),
    b: Math.round((b / base) * 100),
    clarify: Math.round((clarify / base) * 100),
    skipped,
    raw: { a, b, clarify, skipped, total },
  };
}

export function getStageSupport(sessions: Session[]) {
  const allRecords = sessions.flatMap((session) => session.records);
  const stages: Record<string, { A: number; B: number; clarify: number; skipped: number }> = {};

  allRecords.forEach((record) => {
    const eventType = inferRecordEventType(record);
    if (!stages[record.stageId]) stages[record.stageId] = { A: 0, B: 0, clarify: 0, skipped: 0 };
    if (eventType === "clarify_request") {
      stages[record.stageId].clarify++;
    } else if (eventType === "answer" || eventType === "skip") {
      const key = (record.scenario === "skipped" ? "skipped" : record.scenario) as "A" | "B" | "clarify" | "skipped";
      stages[record.stageId][key]++;
    }
  });

  return Object.entries(stages).map(([stageId, counts]) => ({
    stageId,
    ...counts,
  }));
}

export function getSessionSignals(records: RecordItem[]) {
  const flow = reduceFlowState(records);

  return {
    clarifications: flow.clarifyCount,
    returns: flow.backCount,
    retries: flow.retryCount,
    skips: flow.skipCount,
    progress: flow.progressCount,
    completedStages: flow.completedStageIds.size,
    isComplete: flow.isComplete,
  };
}

export function getSessionStatus(session: Session): SessionStatus {
  if (session.status) return session.status;
  return session.finalNote?.trim() ? "completed" : "in_progress";
}

export function getRecordEventLabel(record: RecordItem, lang: AppLang) {
  const eventType = inferRecordEventType(record);

  if (eventType === "clarify_request") {
    return lang === "en" ? "Question was unclear" : "Вопрос был непонятен";
  }
  if (eventType === "back") {
    return lang === "en" ? "Returned to revise" : "Возврат к вопросу";
  }
  if (eventType === "skip") {
    return lang === "en" ? "Step skipped" : "Шаг пропущен";
  }
  return lang === "en" ? "Answer accepted" : "Ответ принят";
}

export function getResponseModeLabel(mode: RecordItem["responseMode"], lang: AppLang) {
  if (mode === "llm-json") {
    return lang === "en" ? "external AI, structured" : "внешний ИИ, структурированный ответ";
  }
  if (mode === "llm-text") {
    return lang === "en" ? "external AI, normalized text" : "внешний ИИ, текст нормализован";
  }
  if (mode === "llm-fallback") {
    return lang === "en" ? "external AI with local fallback" : "внешний ИИ + локальная страховка";
  }
  if (mode === "mock") {
    return lang === "en" ? "local safe mode" : "локальный безопасный режим";
  }
  return lang === "en" ? "source not recorded" : "источник не зафиксирован";
}

export function getTrajectoryNote(
  signals: ReturnType<typeof getSessionSignals>,
  lang: AppLang,
) {
  if (signals.clarifications === 0 && signals.returns === 0 && signals.retries === 0) {
    return lang === "en"
      ? "The session moved through the stages without recorded repairs."
      : "Сессия прошла без зафиксированных уточнений и возвратов.";
  }

  const parts: string[] = [];
  if (signals.clarifications > 0) {
    parts.push(lang === "en" ? "the wording needed clarification" : "формулировку пришлось уточнять");
  }
  if (signals.returns > 0) {
    parts.push(lang === "en" ? "the adolescent returned to revise an answer" : "подросток возвращался к вопросу");
  }
  if (signals.retries > 0) {
    parts.push(lang === "en" ? "a revised attempt appeared after support" : "после поддержки появилась повторная попытка");
  }

  return lang === "en"
    ? `Trajectory: ${parts.join("; ")}. This is useful process data, not a failure marker.`
    : `Траектория: ${parts.join("; ")}. Это данные о процессе, а не признак неуспеха.`;
}

export function createSampleSession(lang: AppLang, locale: string): Session {
  return lang === "en"
    ? {
        context: "study project",
        updatedAt: new Date().toISOString(),
        lang,
        finalNote: "The adolescent benefits more from one small first step and a calm check of the result than from a generic call to try harder.",
        historyInsight: "You have already done good work in previous cycles. The latest session showed you can break big tasks into tiny steps. Keep that momentum — one concrete action today will build real confidence.",
        adolescentFeedback: {
          rating: 4,
          comment: "Было полезно понять, что нужно начинать с маленького шага, а не с идеального плана.",
          timestamp: new Date().toISOString(),
        },
        records: [
          {
            stageId: "1",
            stageTitle: "Goal",
            scenario: "A",
            question: "What matters most to improve right now?",
            answer: "I want to finish the project, but I do not know where to start.",
            feedback: "The goal is visible, but it will help to narrow it down to one concrete result for the near future.",
            timestamp: new Date().toLocaleString(locale),
          },
          {
            stageId: "2",
            stageTitle: "Move to action",
            scenario: "A",
            question: "What small step can you do today?",
            answer: "I can make the structure and write the first paragraph.",
            feedback: "A workable first step has appeared. Now it is important to keep the plan simple and not overload it.",
            timestamp: new Date().toLocaleString(locale),
          },
        ],
      }
    : {
        context: "учебный проект",
        updatedAt: new Date().toISOString(),
        lang,
        finalNote: "Подростку полезнее один посильный первый шаг и спокойная проверка результата, чем общий призыв «стараться сильнее».",
        historyInsight: "Ты уже проделал хорошую работу в прошлых циклах. Последняя сессия показала, что ты умеешь разбивать большие задачи на крошечные шаги. Сохраняй этот импульс — одно конкретное действие сегодня сильно поднимет уверенность.",
        adolescentFeedback: {
          rating: 4,
          comment: "Было полезно понять, что нужно начинать с маленького шага, а не с идеального плана.",
          timestamp: new Date().toISOString(),
        },
        records: [
          {
            stageId: "1",
            stageTitle: "Цель",
            scenario: "A",
            question: "Что сейчас важнее всего улучшить?",
            answer: "Хочу закончить проект, но пока не понимаю, с чего начать.",
            feedback: "Цель уже видна, но ее стоит сузить до одного ближайшего результата.",
            timestamp: new Date().toLocaleString(locale),
          },
          {
            stageId: "2",
            stageTitle: "Переход к действию",
            scenario: "A",
            question: "Какой маленький шаг можно сделать сегодня?",
            answer: "Могу сделать структуру и написать первый абзац.",
            feedback: "Появился рабочий первый шаг. Дальше важно не перегрузить план.",
            timestamp: new Date().toLocaleString(locale),
          },
        ],
      };
}

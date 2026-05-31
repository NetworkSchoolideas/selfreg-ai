import type { AppLang } from "@/lib/app-i18n";
import type { Scenario, StageId } from "@/lib/selfreg-model";

/**
 * Единый источник правды для доменных типов сессии саморегуляции.
 *
 * Эти типы используются в прототипе подростка, дашборде педагога,
 * хранилище детей и AI-сервисе. Не дублируй их в других файлах —
 * импортируй отсюда.
 */

/** Один зафиксированный шаг прохождения цикла (этап + ответ + фидбек). */
export interface RecordItem {
  stageId: StageId;
  stageTitle: string;
  scenario: Scenario;
  answer: string;
  feedback: string;
  question: string;
  timestamp: string;
}

/** Обратная связь подростка после завершения сессии (для педагога/психолога). */
export interface AdolescentFeedback {
  /** 1-5, опционально */
  rating?: number;
  comment: string;
  timestamp: string;
}

/**
 * Сохранённая сессия (черновик или завершённая).
 * Если присутствует непустой `finalNote`, сессия считается завершённой.
 */
export interface Session {
  context: string;
  records: RecordItem[];
  finalNote: string;
  updatedAt: string;
  lang?: AppLang;
  childId?: string;
  /** Комментарий ИИ на основе истории, полученный перед стартом этой сессии. */
  historyInsight?: string;
  /** Обратная связь подростка после завершения сессии. */
  adolescentFeedback?: AdolescentFeedback;
}

/** Завершённая сессия — гарантированно с непустым `finalNote`. */
export interface CompletedSession extends Session {
  finalNote: string;
}

/** Реальные (деанонимизирующие) данные участника. */
export interface ChildRealData {
  fio: string;
  klass: string;
}

/**
 * Профиль ребёнка/участника в "базе детей".
 * `name` по умолчанию равен анонимному ID; реальные данные — в `realData`.
 */
export interface ChildProfile {
  id: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
  sessions: Session[];
  realData?: ChildRealData;
}

/**
 * Чистое состояние ядра сессии (то, чем владеет useAdolescentSession).
 * UI-only флаги сюда не входят.
 */
export interface SessionState {
  context: string;
  stageId: StageId;
  records: RecordItem[];
  finalNote: string;
  lastClarificationFeedback: string | null;
  answer: string;
  pendingHistoryInsight: string | null;
  suppressClarifyForNextStage: boolean;
}

/** Результат продвижения по этапам после добавления записи. */
export interface AdvanceResult {
  completed: boolean;
  nextRecords: RecordItem[];
  nextStageId?: StageId;
}

/** Режим, в котором был получен ответ (для статуса провайдера). */
export type ResponseMode = "mock" | "llm-json" | "llm-text" | "llm-fallback";

/** Нормализованный результат одного обращения к AI (этап цикла). */
export interface AiStageResult {
  scenario: Scenario;
  feedback: string;
  finalNote: string;
  responseMode: ResponseMode;
}

/** Элемент истории, передаваемый в /api/chat. */
export interface ChatHistoryItem {
  stage: string;
  answer: string;
  feedback?: string;
}

/** Результат проверки качества ответа пользователя. */
export interface AnswerQualityResult {
  ok: boolean;
  message?: string;
}

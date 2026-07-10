import type { AppLang } from "@/lib/app-i18n";
import type { Scenario, StageId } from "@/lib/selfreg-model";
import type { ProviderId } from "@/lib/provider-registry";

export type RecordEventType = "answer" | "clarify_request" | "back" | "retry" | "skip";
export type SessionStatus = "draft" | "in_progress" | "completed" | "abandoned";

/**
 * Единый источник доменных типов сессии саморегуляции.
 * Эти типы используются в прототипе подростка, дашборде педагога,
 * локальном хранилище и серверной синхронизации.
 */
export interface RecordItem {
  stageId: StageId;
  stageTitle: string;
  scenario: Scenario;
  eventType?: RecordEventType;
  provider?: ProviderId;
  model?: string;
  responseMode?: ResponseMode;
  answer: string;
  feedback: string;
  question: string;
  timestamp: string;
}

/** Обратная связь подростка после завершения сессии. */
export interface AdolescentFeedback {
  /** 1-5, опционально. */
  rating?: number;
  comment: string;
  timestamp: string;
}

/** Сохраненная сессия: черновик или завершенный цикл. */
export interface Session {
  sessionId?: string;
  status?: SessionStatus;
  context: string;
  records: RecordItem[];
  finalNote: string;
  updatedAt: string;
  lang?: AppLang;
  childId?: string;
  /** Комментарий ИИ на основе предыдущих сессий. */
  historyInsight?: string;
  /** Обратная связь подростка после завершения сессии. */
  adolescentFeedback?: AdolescentFeedback;
  /** Сессия скрыта учеником из личного кабинета, но остаётся видимой педагогу. */
  studentArchivedAt?: string;
}

/** Завершенная сессия гарантированно содержит итоговую заметку. */
export interface CompletedSession extends Session {
  finalNote: string;
}

/** Реальные деанонимизирующие данные участника. */
export interface ChildRealData {
  fio: string;
  klass: string;
}

/** Профиль ребенка/участника в базе педагога. */
export interface ChildProfile {
  id: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
  sessions: Session[];
  realData?: ChildRealData;
  teacherId?: string;
  consentGiven?: boolean;
  consentTimestamp?: string;
}

/** Состояние ядра сессии, без UI-only флагов. */
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

/** Результат продвижения после добавления записи. */
export interface AdvanceResult {
  completed: boolean;
  nextRecords: RecordItem[];
  nextStageId?: StageId;
}

/** Режим получения ответа ИИ. */
export type ResponseMode = "mock" | "llm-json" | "llm-text" | "llm-fallback";

/** Нормализованный результат одного обращения к AI. */
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
  scenario?: Scenario;
  eventType?: RecordEventType;
}

/** Результат проверки качества ответа пользователя. */
export interface AnswerQualityResult {
  ok: boolean;
  message?: string;
}

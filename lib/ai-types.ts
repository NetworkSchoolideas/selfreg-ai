import type { ProviderId } from "@/lib/provider-registry";
import type { Scenario } from "@/lib/selfreg-model";
import type { AppLang } from "@/lib/app-i18n";
import type { RecordEventType } from "@/types/session";

export type AnalyzeHistoryItem = {
  stage: string;
  answer: string;
  feedback?: string;
  scenario?: Scenario;
  eventType?: RecordEventType;
};

export type AnalyzeInput = {
  userId: string;
  answer: string;
  currentStage: string;
  context?: string;
  provider?: ProviderId;
  model?: string;
  userApiKey?: string;
  lang?: AppLang;
  history: AnalyzeHistoryItem[];
  nonAcademicContext?: boolean;
  forcedScenario?: Scenario;
};

export type AnalyzeResult = {
  nextStage: string;
  scenario: Scenario;
  feedback: string;
  dashboardNote?: string;
  responseMode?: "mock" | "llm-json" | "llm-text" | "llm-fallback";
};

export type AiProvider = {
  analyze(input: AnalyzeInput): Promise<AnalyzeResult>;
};

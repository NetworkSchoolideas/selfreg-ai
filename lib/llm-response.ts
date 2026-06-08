import type { AnalyzeInput, AnalyzeResult } from "@/lib/ai-types";
import { makeMockFeedback, type Scenario, type StageId } from "@/lib/selfreg-model";

/**
 * SCENARIO OWNERSHIP — FINAL STATE (после закрытия последних двух утечек):
 *
 * - forcedScenario от scenario-engine (через /api/chat/route.ts) — АБСОЛЮТНЫЙ приоритет.
 * - LLM (в любом провайдере) не имеет права влиять на выбор A/B/clarify.
 * - Старый detectScenario больше нигде не вызывается в реальных путях (только @deprecated для истории).
 * - Даже в mock-режиме и при парсинге LLM-ответа сценарий всегда приходит от движка или безопасно дефолтится в "A".
 *
 * Это завершение архитектурного ownership: бэкенд владеет сценарием полностью.
 */

function parseJsonCandidate(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/\{[\s\S]*\}/);
  const candidate = match ? match[0] : trimmed;

  try {
    return JSON.parse(candidate) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function decodeJsonString(value: string) {
  try {
    return JSON.parse(`"${value}"`) as string;
  } catch {
    return value.replace(/\\"/g, '"').replace(/\\n/g, "\n");
  }
}

function extractLooseField(text: string, field: string) {
  const regex = new RegExp(`"${field}"\\s*:\\s*"((?:\\\\.|[^"])*)"`);
  const match = text.match(regex);
  if (!match?.[1]) return "";
  return decodeJsonString(match[1]).trim();
}

function collectParsedText(parsed: Record<string, unknown> | null) {
  if (!parsed) return "";
  return Object.entries(parsed)
    .filter(([key, value]) => key !== "nextStage" && key !== "scenario" && typeof value === "string")
    .map(([, value]) => String(value).trim())
    .filter(Boolean)
    .join(" ");
}

function normalizeScenario(value: unknown, fallback: Scenario): Scenario {
  if (value === "A" || value === "B" || value === "clarify") return value;
  return fallback;
}

function normalizeStage(value: unknown, fallback: StageId): StageId {
  return value === "1" || value === "2" || value === "3" || value === "4" || value === "5" ? value : fallback;
}

function normalizeFeedback(text: string) {
  const trimmed = text.trim();
  if (!trimmed || trimmed === "{}") return "";
  if (trimmed.startsWith("{") && trimmed.includes("\"nextStage\"")) return "";

  const flattened = trimmed.replace(/\s+/g, " ").trim();
  const sentences =
    flattened
      .match(/[^.!?]+[.!?]?/g)
      ?.map((item) => item.trim())
      .filter(Boolean) || [flattened];
  const compact = sentences.slice(0, 3).join(" ").trim();

  if (compact.length <= 420) return compact;
  return `${compact.slice(0, 417).trim()}...`;
}

export function buildAnalyzeResultFromLlm(args: {
  content: unknown;
  input: AnalyzeInput;
  expectedNextStage: StageId;
  providerTitle: string;
  dashboardFallback: string;
}): AnalyzeResult {
  const { content, input, expectedNextStage, providerTitle, dashboardFallback } = args;
  const text = typeof content === "string" ? content.trim() : "";
  const lang = input.lang || "ru";
  const fallback = makeMockFeedback({
    stageId: input.currentStage as StageId,
    answer: input.answer,
    context: input.context || "",
    history: input.history,
    lang,
    forcedScenario: input.forcedScenario
  });

  const parsed = parseJsonCandidate(text);

  const parsedFeedback =
    typeof parsed?.feedback === "string" ? parsed.feedback.trim() : extractLooseField(text, "feedback");
  const parsedDashboard =
    typeof parsed?.dashboardNote === "string" ? parsed.dashboardNote.trim() : extractLooseField(text, "dashboardNote");
  const parsedScenario =
    typeof parsed?.scenario === "string" ? parsed.scenario.trim() : extractLooseField(text, "scenario");
  const parsedStage =
    typeof parsed?.nextStage === "string" ? parsed.nextStage.trim() : extractLooseField(text, "nextStage");

  const safeFeedback = parsed
    ? normalizeFeedback(parsedFeedback) || normalizeFeedback(collectParsedText(parsed)) || fallback.feedback
    : normalizeFeedback(text) || fallback.feedback;
  const safeDashboard = normalizeFeedback(parsedDashboard) || dashboardFallback;

  /**
   * Финальное решение по сценарию (после закрытия двух последних утечек legacy).
   * Приоритет (жёсткий):
   * 1. forcedScenario от scenario-engine (через роут) — абсолютный.
   * 2. Если LLM всё-таки вернул валидный scenario в JSON — принимаем (как мягкий fallback, но крайне нежелательно).
   * 3. Самый безопасный default — "A" (самый частый и полезный сценарий поддержки).
   */
  function resolveScenario(parsed: unknown): Scenario {
    if (input.forcedScenario) return input.forcedScenario;

    // Если LLM вернул валидный scenario — используем его, иначе безопасный default "A"
    return normalizeScenario(parsed, "A");
  }

  const finalScenario = resolveScenario(parsedScenario);

  // "skipped" is a client-side only marker (explicit user choice on ClarificationBox).
  // The AI layer must never return it.
  const safeScenario = finalScenario === "skipped" ? "clarify" : finalScenario;

  if (parsed) {
    const hasOwnFeedback = Boolean(normalizeFeedback(parsedFeedback) || normalizeFeedback(collectParsedText(parsed)));
    return {
      nextStage: normalizeStage(parsedStage, expectedNextStage),
      scenario: safeScenario,
      feedback: safeFeedback,
      dashboardNote: safeDashboard,
      responseMode: hasOwnFeedback ? "llm-json" : "llm-fallback"
    };
  }

  if (normalizeFeedback(text)) {
    return {
      nextStage: expectedNextStage,
      scenario: safeScenario,
      feedback: normalizeFeedback(text),
      dashboardNote:
        lang === "en"
          ? `${providerTitle}: a free-text model response was received and normalized for the prototype.`
          : `${providerTitle}: получен свободный ответ модели, сервер привел его к формату прототипа.`,
      responseMode: "llm-text"
    };
  }

  return {
    nextStage: expectedNextStage,
    scenario: safeScenario,
    feedback: fallback.feedback,
    dashboardNote:
      lang === "en"
        ? `${providerTitle}: the external reply was empty or unusable, so a local safety interpretation was shown.`
        : `${providerTitle}: внешний ответ оказался пустым или непригодным, поэтому показана локальная безопасная интерпретация.`,
    responseMode: "llm-fallback"
  };
}

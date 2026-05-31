/**
 * Scenario Engine — единая эвристическая (жёсткая) логика выбора сценария поддержки.
 *
 * ФИЛОСОФИЯ (не линейная, настоящая персонализация):
 * На каждом этапе 5-шаговой модели подросток может нуждаться в РАЗНОМ типе поддержки
 * независимо от предыдущих шагов. 
 *   A — «не хватает опоры» (помочь структурировать, конкретизировать, снизить порог входа)
 *   B — «опора стала избыточной / жёсткой» (смягчить перфекционизм, самообвинение, давление)
 *   clarify — «вопрос не понят или ответ слишком короткий/уклончивый»
 *
 * LLM НИКОГДА не решает сценарий. Он только очеловечивает формулировку и даёт текст.
 * Все решения — здесь, в чистом коде эвристик. Это и есть «укрепление программной архитектуры модели».
 *
 * forcedScenario (если передан) имеет высший приоритет — используется для тестов, учителя,
 * специальных случаев и как guard против попыток LLM переопределить логику.
 */

import type { AppLang } from "@/lib/app-i18n";
import type { Scenario } from "@/lib/selfreg-model";

export type ScenarioReason = string;

export interface ScenarioDetectionResult {
  scenario: Scenario;
  reason: ScenarioReason;
  signals: string[];           // какие маркеры/паттерны сработали
  historySummary?: string;     // краткий анализ истории (для дашборда/отладки)
}

/* =========================================================
   ЦЕНТРАЛИЗОВАННЫЕ МАРКЕРЫ (расширяемые, но явные)
   ========================================================= */

// Эти маркеры вынесены для переиспользования (в частности scenario-guards)
export const RU_CLARIFY: string[] = [
  "не понял", "не поняла", "не понимаю", "неясно", "объясни",
  "что это значит", "не знаю что ответить", "не могу ответить", "не знаю"
];

export const EN_CLARIFY: string[] = [
  "don't understand", "do not understand", "not sure what you mean",
  "what does that mean", "unclear", "can you explain", "i don't know what to say",
  "i don't know"
];

// B — избыточное давление, перфекционизм, самообвинение, беспомощность
const RU_B: string[] = [
  // перфекционизм / долженствование
  "идеально", "обязан", "должен", "должна", "провал", "катастроф", "все плохо",
  "без шансов", "любой ценой", "слишком поздно", "ужасно",
  // самообвинение / стыд
  "боюсь", "страшно", "стыдно", "опозор", "глупость", "ненавижу себя", "ненавижу",
  "все испорчу", "все испортил", "ничего не получится", "не вывожу",
  "лучше молч", "скажу глупость"
];

const EN_B: string[] = [
  "perfect", "must", "have to", "failure", "disaster", "no chance", "any cost",
  "too late", "awful", "hate myself", "ashamed", "embarrass", "say something stupid",
  "better stay silent", "nothing will work", "i can't", "i'm scared", "afraid"
];

// Дополнительные сигналы беспомощности / выученной беспомощности (усиливают B)
const RU_HELPLESS = ["не могу", "не получается", "бессмысленно", "зачем", "все равно"];
const EN_HELPLESS = ["i can't", "doesn't work", "no point", "why bother", "useless", "hopeless"];

/* =========================================================
   ВСПОМОГАТЕЛЬНЫЕ ЭВРИСТИКИ (чистые функции)
   ========================================================= */

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

function countMatches(text: string, markers: string[]): number {
  return markers.filter(m => text.includes(m)).length;
}

function analyzeHistory(history: Array<{ stage: string; answer: string; feedback?: string }>, lang: AppLang) {
  const bMarkers = lang === "en" ? EN_B : RU_B;
  let bStreak = 0;
  let clarifyCount = 0;
  let oscillation = 0;
  let lastScenario: Scenario | null = null;

  for (const h of history) {
    // "skipped" records (explicit user choice via "Пропустить этот шаг") are cosmetic.
    // They must not pollute clarifyCount or B-streak (restored from original balanced behavior).
    if ((h as any).scenario === "skipped") continue;

    const fb = (h.feedback || "").toLowerCase();
    let s: Scenario | null = null;
    if (fb.includes("clarif") || fb.includes("уточн") || fb.includes("проясн")) s = "clarify";
    else if (fb.includes("b") || fb.includes("избыточн") || fb.includes("давлен") || fb.includes("смягч")) s = "B";
    else if (fb.includes("a") || fb.includes("опор") || fb.includes("структур")) s = "A";

    if (s === "clarify") clarifyCount++;
    if (s === "B") bStreak++;
    else bStreak = 0;

    if (lastScenario && s && lastScenario !== s) oscillation++;
    if (s) lastScenario = s;
  }

  return {
    bStreak,
    clarifyCount,
    oscillation,
    lastScenario,
    total: history.length
  };
}

/* =========================================================
   ГЛАВНАЯ ЭВРИСТИКА (независимая на каждом шаге)
   ========================================================= */

export function detectScenarioHeuristically(
  answer: string,
  context: string = "",
  history: Array<{ stage: string; answer: string; feedback?: string }> = [],
  lang: AppLang = "ru",
  /** Высший приоритет — принудительное задание сценария (тесты, учитель, guard) */
  forcedScenario?: Scenario
): ScenarioDetectionResult {

  // 0. forcedScenario (самый жёсткий guard — LLM не может его обойти)
  if (forcedScenario && (forcedScenario === "A" || forcedScenario === "B" || forcedScenario === "clarify")) {
    return {
      scenario: forcedScenario,
      reason: "forcedScenario override (высший приоритет, не зависит от эвристик)",
      signals: ["forced"],
      historySummary: undefined
    };
  }

  const norm = normalize(answer);
  const full = normalize(`${context} ${answer}`);
  const signals: string[] = [];

  // 1. Анализ истории (даёт контекст, но не отменяет независимость текущего шага)
  const h = analyzeHistory(history, lang);
  const historySummary = h.total > 0
    ? `history: ${h.total} шагов, B-streak=${h.bStreak}, clarify=${h.clarifyCount}, oscillation=${h.oscillation}`
    : undefined;

  // Restored closer to the original working logic (balanced version from the repo).
  // Order: short/clarify markers first (as in original), then B, default A.
  // This gave reasonable Clarify triggering without starving B.
  // "skipped" (explicit user skip) is handled as cosmetic and ignored for chaining.

  const clarifyM = lang === "en" ? EN_CLARIFY : RU_CLARIFY;

  if (norm.length < 3) {
    signals.push("short");
    return { scenario: "clarify", reason: "Ответ слишком короткий", signals, historySummary };
  }
  if (countMatches(norm, clarifyM) > 0) {
    signals.push("clarify-marker");
    return { scenario: "clarify", reason: "Явные маркеры непонимания вопроса", signals, historySummary };
  }

  // B signals (pressure etc.)
  const bM = lang === "en" ? EN_B : RU_B;
  const helplessM = lang === "en" ? EN_HELPLESS : RU_HELPLESS;

  const bDirect = countMatches(full, bM);
  const bHelpless = countMatches(full, helplessM);

  if (bDirect >= 1) {
    signals.push("b-pressure");
    return {
      scenario: "B",
      reason: "Обнаружены маркеры перфекционизма / самообвинения / избыточного давления",
      signals,
      historySummary
    };
  }

  if (bHelpless >= 1) {
    signals.push("helplessness");
    return {
      scenario: "B",
      reason: "Сигналы выученной беспомощности / обесценивания собственных усилий",
      signals,
      historySummary
    };
  }

  // 4. История усиливает B (только если прямых B-маркеров не было, но паттерн повторяется)
  if (h.bStreak >= 2 && (bDirect > 0 || bHelpless > 0 || norm.length > 40)) {
    signals.push("b-streak-history");
    return {
      scenario: "B",
      reason: "Повторяющийся паттерн B (избыточное давление) в последних ответах",
      signals,
      historySummary
    };
  }

  // 5. Clarify по истории (только при очень большом количестве уточнений подряд)
  // После одного-двух skip'ов пользователь должен иметь шанс нормально пройти оставшиеся этапы.
  if (h.clarifyCount >= 3) {
    signals.push("clarify-history");
    return {
      scenario: "clarify",
      reason: "Много уточнений в истории — лучше прояснить смысл, чем продолжать цикл",
      signals,
      historySummary
    };
  }

  // 6. По умолчанию — A (недостаток опоры / нужна помощь структурировать)
  // Это соответствует «когда не хватает опоры» — самый частый случай в подростковом возрасте
  signals.push("default-a");
  return {
    scenario: "A",
    reason: "Базовый сценарий: недостаток опоры / нужна помощь в конкретизации и первом шаге",
    signals,
    historySummary
  };
}

/**
 * Публичная функция для чат-роута и тестов.
 * forcedScenario (если передан) имеет абсолютный приоритет.
 */
export function decideSupportScenario(
  answer: string,
  context: string = "",
  history: Array<{ stage: string; answer: string; feedback?: string }> = [],
  lang: AppLang = "ru",
  forcedScenario?: Scenario
): Scenario {
  const result = detectScenarioHeuristically(answer, context, history, lang, forcedScenario);
  return result.scenario;
}

/**
 * Расширенная версия — возвращает всё для логирования / дашборда педагога.
 */
export function decideSupportScenarioDetailed(
  answer: string,
  context: string = "",
  history: Array<{ stage: string; answer: string; feedback?: string }> = [],
  lang: AppLang = "ru",
  forcedScenario?: Scenario
): ScenarioDetectionResult {
  return detectScenarioHeuristically(answer, context, history, lang, forcedScenario);
}

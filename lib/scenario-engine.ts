import type { AppLang } from "@/lib/app-i18n";
import type { Scenario, StageId } from "@/lib/selfreg-model";

export type ScenarioReason = string;

export interface ScenarioDetectionResult {
  scenario: Scenario;
  reason: ScenarioReason;
  signals: string[];
  historySummary?: string;
}

type HistoryItem = {
  stage: string;
  answer: string;
  feedback?: string;
  scenario?: Scenario | string;
  eventType?: string;
};

const STAGE_IDS: StageId[] = ["1", "2", "3", "4", "5"];

export const RU_CLARIFY: string[] = [
  "не понял",
  "не поняла",
  "не понимаю",
  "неясно",
  "объясни",
  "что это значит",
  "не знаю что ответить",
  "не знаю, что ответить",
  "не могу ответить",
  "не понял вопрос",
  "не поняла вопрос"
];

export const EN_CLARIFY: string[] = [
  "don't understand",
  "do not understand",
  "not sure what you mean",
  "what does that mean",
  "unclear",
  "can you explain",
  "i don't know what to say",
  "i don't understand the question"
];

const RU_B_PRESSURE: string[] = [
  "идеально",
  "обязан",
  "обязана",
  "должен",
  "должна",
  "любой ценой",
  "иначе",
  "провал",
  "катастроф",
  "позор",
  "ужас",
  "стыд",
  "опозор",
  "все плохо",
  "всё плохо",
  "без шансов",
  "слишком поздно",
  "ненавижу себя",
  "все испорчу",
  "всё испорчу",
  "все испортил",
  "всё испортил",
  "все испортила",
  "всё испортила",
  "не вывожу",
  "я туп",
  "я глуп",
  "я ничтож",
  "лучше молч",
  "скажу глупость",
  "полный провал"
];

const RU_B_HELPLESS: string[] = [
  "не могу",
  "не получится",
  "ничего не получится",
  "бессмысленно",
  "нет смысла",
  "зачем вообще",
  "все равно",
  "всё равно",
  "я сдаюсь",
  "не справлюсь",
  "не способен",
  "не способна"
];

const RU_B_IMPULSE: string[] = [
  "сделаю сразу все",
  "сделаю сразу всё",
  "не буду думать",
  "просто начну",
  "быстро доделаю как угодно",
  "надо срочно",
  "сейчас все брошу",
  "сейчас всё брошу"
];

const EN_B_PRESSURE: string[] = [
  "perfect",
  "must",
  "have to",
  "at any cost",
  "otherwise",
  "failure",
  "disaster",
  "shame",
  "ashamed",
  "embarrass",
  "awful",
  "no chance",
  "too late",
  "hate myself",
  "i will ruin",
  "better stay silent",
  "say something stupid",
  "total failure"
];

const EN_B_HELPLESS: string[] = [
  "i can't",
  "cannot",
  "won't work",
  "nothing will work",
  "no point",
  "useless",
  "hopeless",
  "i give up",
  "i won't manage"
];

const EN_B_IMPULSE: string[] = [
  "do everything at once",
  "without thinking",
  "just start",
  "rush",
  "urgent",
  "drop everything"
];

const RU_MEANINGFUL_SHORT = [
  "устал",
  "страшно",
  "боюсь",
  "злюсь",
  "стыдно",
  "экзамен",
  "спорт",
  "тренировка",
  "общение",
  "проект",
  "не хочу",
  "не могу"
];

const EN_MEANINGFUL_SHORT = [
  "tired",
  "scared",
  "angry",
  "ashamed",
  "exam",
  "sport",
  "training",
  "friends",
  "project",
  "don't want",
  "can't"
];

const RU_STAGE_B_MARKERS: Record<StageId, string[]> = {
  "1": [
    "только пятер",
    "только 5",
    "любой ценой",
    "идеально",
    "лучше всех",
    "доказать всем",
    "иначе я никто"
  ],
  "2": [
    "сразу все",
    "сразу всё",
    "никак не начну",
    "не начну",
    "застрял",
    "застряла",
    "откладываю",
    "потом",
    "срочно все",
    "срочно всё"
  ],
  "3": [
    "я плох",
    "я туп",
    "я бездар",
    "меня униз",
    "это несправедливо",
    "обидно",
    "лучше молч",
    "они правы"
  ],
  "4": [
    "всё зря",
    "все зря",
    "ничего не вышло",
    "идеально или никак",
    "нигде",
    "полный ноль",
    "вообще не совпало"
  ],
  "5": [
    "переделаю всё",
    "переделаю все",
    "брошу",
    "сдамся",
    "не буду больше",
    "начну с нуля",
    "заново все",
    "заново всё"
  ]
};

const EN_STAGE_B_MARKERS: Record<StageId, string[]> = {
  "1": [
    "only top grade",
    "only an a",
    "at any cost",
    "perfect",
    "better than everyone",
    "otherwise i am nothing"
  ],
  "2": [
    "everything at once",
    "can't start",
    "stuck",
    "keep postponing",
    "later",
    "urgent all at once"
  ],
  "3": [
    "i am bad",
    "i am stupid",
    "they humiliated me",
    "it is unfair",
    "better stay silent",
    "they are right about me"
  ],
  "4": [
    "everything was pointless",
    "nothing worked",
    "nothing matched",
    "perfect or nothing",
    "nowhere",
    "total zero",
    "total failure",
    "doesn't match at all"
  ],
  "5": [
    "redo everything",
    "i will quit",
    "give up",
    "start from zero",
    "never again"
  ]
};

const RU_STAGE_MEANINGFUL_SHORT: Partial<Record<StageId, string[]>> = {
  "1": ["экзамен", "проект", "спорт", "сон", "общение", "тренировка"],
  "2": ["отдохнуть", "пауза", "таймер", "план", "черновик", "структура"],
  "3": ["ошибка", "замечание", "оценка", "результат"],
  "4": ["план", "цель", "результат"],
  "5": ["пауза", "проще", "иначе", "потом"]
};

const EN_STAGE_MEANINGFUL_SHORT: Partial<Record<StageId, string[]>> = {
  "1": ["exam", "project", "sport", "sleep", "communication", "training"],
  "2": ["rest", "pause", "timer", "plan", "draft", "outline"],
  "3": ["mistake", "comment", "grade", "result"],
  "4": ["plan", "goal", "result"],
  "5": ["pause", "simpler", "later", "adjust"]
};

const RU_STAGE_B_REASON: Record<StageId, string> = {
  "1": "На этапе цели в ответе слышится слишком жесткая или внешняя рамка, поэтому опору нужно смягчить и сузить цель.",
  "2": "На этапе перехода к действию в ответе видны либо ступор, либо рывок без меры, поэтому нужен более реалистичный первый шаг.",
  "3": "На этапе обратной связи ответ показывает самоудар или защитную реакцию, поэтому важно отделить сигнал от оценки себя.",
  "4": "На этапе сравнения ответ уходит в обнуление или жесткий общий вывод, поэтому полезно вернуть сравнение к одному критерию и одному расхождению.",
  "5": "На этапе коррекции ответ звучит как срыв в отказ или тотальный передел, поэтому лучше искать одну посильную корректировку."
};

const EN_STAGE_B_REASON: Record<StageId, string> = {
  "1": "At the goal stage the answer sounds too rigid or externally driven, so the support should soften and narrow the goal.",
  "2": "At the action stage the answer shows either paralysis or an over-fast rush, so a more realistic first step is needed.",
  "3": "At the feedback stage the answer shows self-attack or defensive tension, so it is better to separate the signal from self-evaluation.",
  "4": "At the comparison stage the answer collapses into a harsh all-or-nothing conclusion, so it is better to return to one criterion and one mismatch.",
  "5": "At the adjustment stage the answer sounds like quitting or total rebuilding, so the support should focus on one manageable correction."
};

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeStageId(value?: string): StageId | undefined {
  if (!value) return undefined;
  return STAGE_IDS.includes(value as StageId) ? (value as StageId) : undefined;
}

function countMatches(text: string, markers: string[]): number {
  return markers.reduce((count, marker) => count + (text.includes(marker) ? 1 : 0), 0);
}

function hasAny(text: string, markers: string[]): boolean {
  return countMatches(text, markers) > 0;
}

function getMarkers(lang: AppLang) {
  return {
    clarify: lang === "en" ? EN_CLARIFY : RU_CLARIFY,
    pressure: lang === "en" ? EN_B_PRESSURE : RU_B_PRESSURE,
    helpless: lang === "en" ? EN_B_HELPLESS : RU_B_HELPLESS,
    impulse: lang === "en" ? EN_B_IMPULSE : RU_B_IMPULSE,
    meaningfulShort: lang === "en" ? EN_MEANINGFUL_SHORT : RU_MEANINGFUL_SHORT
  };
}

function getStageSpecificMarkers(lang: AppLang, stageId?: StageId) {
  if (!stageId) return [];
  return lang === "en" ? EN_STAGE_B_MARKERS[stageId] : RU_STAGE_B_MARKERS[stageId];
}

function getStageMeaningfulShort(lang: AppLang, stageId?: StageId) {
  if (!stageId) return [];
  return lang === "en"
    ? (EN_STAGE_MEANINGFUL_SHORT[stageId] || [])
    : (RU_STAGE_MEANINGFUL_SHORT[stageId] || []);
}

function summarizeHistory(history: HistoryItem[]) {
  let progressCount = 0;
  let clarifyCount = 0;
  let backCount = 0;
  let lastEvent = "";
  let lastScenario: Scenario | "" = "";

  for (const item of history) {
    const eventType = item.eventType || "";
    const scenario = item.scenario;

    if (eventType === "clarify_request" || scenario === "clarify") clarifyCount += 1;
    if (eventType === "back") backCount += 1;
    if (scenario === "A" || scenario === "B") {
      progressCount += 1;
      lastScenario = scenario;
    }
    if (eventType) lastEvent = eventType;
  }

  return {
    progressCount,
    clarifyCount,
    backCount,
    lastEvent,
    lastScenario,
    text:
      history.length > 0
        ? `history: records=${history.length}, progress=${progressCount}, clarify=${clarifyCount}, back=${backCount}, lastEvent=${lastEvent || "unknown"}, lastScenario=${lastScenario || "none"}`
        : undefined
  };
}

function detectStageSpecificB(
  norm: string,
  full: string,
  lang: AppLang,
  stageId?: StageId
) {
  const markers = getStageSpecificMarkers(lang, stageId);
  const hits = markers.filter((marker) => full.includes(marker) || norm === marker);

  if (hits.length === 0) {
    return { isB: false, signals: [] as string[], reason: undefined as string | undefined };
  }

  const signals = Array.from(new Set(hits.map(() => `stage-${stageId}-risk`)));
  const reason = stageId
    ? (lang === "en" ? EN_STAGE_B_REASON[stageId] : RU_STAGE_B_REASON[stageId])
    : undefined;

  return { isB: true, signals, reason };
}

function shouldClarify(
  norm: string,
  lang: AppLang,
  history: ReturnType<typeof summarizeHistory>,
  stageId?: StageId
) {
  const markers = getMarkers(lang);
  const wordCount = norm.split(" ").filter(Boolean).length;
  const hasClarifyMarker = hasAny(norm, markers.clarify);
  const hasMeaningfulShortSignal =
    hasAny(norm, markers.meaningfulShort) || hasAny(norm, getStageMeaningfulShort(lang, stageId));

  if (hasClarifyMarker) return { clarify: true, signal: "clarify-marker" };
  if (norm.length < 3) return { clarify: true, signal: "too-short" };

  const retryAfterRepair = history.lastEvent === "clarify_request" || history.lastEvent === "back";
  if (retryAfterRepair && norm.length >= 3) return { clarify: false, signal: "" };

  if (wordCount <= 2 && !hasMeaningfulShortSignal) return { clarify: true, signal: "too-vague" };
  return { clarify: false, signal: "" };
}

export function detectScenarioHeuristically(
  answer: string,
  context: string = "",
  history: HistoryItem[] = [],
  lang: AppLang = "ru",
  forcedScenario?: Scenario,
  currentStage?: string
): ScenarioDetectionResult {
  if (forcedScenario === "A" || forcedScenario === "B" || forcedScenario === "clarify") {
    return {
      scenario: forcedScenario,
      reason: "Scenario was explicitly forced by the caller.",
      signals: ["forced"]
    };
  }

  const norm = normalize(answer);
  const full = normalize(`${context} ${answer}`);
  const stageId = normalizeStageId(currentStage);
  const markers = getMarkers(lang);
  const historySummary = summarizeHistory(history);
  const signals: string[] = [];

  const stageSpecific = detectStageSpecificB(norm, full, lang, stageId);
  const pressure = countMatches(full, markers.pressure);
  const helpless = countMatches(full, markers.helpless);
  const impulse = countMatches(full, markers.impulse);

  if (stageSpecific.isB || pressure > 0 || helpless > 0 || impulse > 0) {
    if (pressure > 0) signals.push("b-pressure");
    if (helpless > 0) signals.push("b-helplessness");
    if (impulse > 0) signals.push("b-impulse");
    signals.push(...stageSpecific.signals);

    return {
      scenario: "B",
      reason:
        stageSpecific.reason ||
        (lang === "en"
          ? "The answer contains pressure, helplessness, harsh self-judgment, or impulsive overload."
          : "В ответе есть давление, беспомощность, жесткая самооценка или импульсивная перегрузка."),
      signals: Array.from(new Set(signals)),
      historySummary: historySummary.text
    };
  }

  const clarify = shouldClarify(norm, lang, historySummary, stageId);
  if (clarify.clarify) {
    signals.push(clarify.signal);
    return {
      scenario: "clarify",
      reason:
        lang === "en"
          ? "The answer does not yet give enough material for the next stage."
          : "Ответ пока не дает достаточно материала для следующего этапа.",
      signals,
      historySummary: historySummary.text
    };
  }

  signals.push(stageId ? `stage-${stageId}-default-a` : "default-a");
  return {
    scenario: "A",
    reason:
      lang === "en"
        ? "The answer gives usable material, but the adolescent still needs structure and a realistic next step."
        : "В ответе есть материал для работы, но подростку нужна структура и посильный следующий шаг.",
    signals,
    historySummary: historySummary.text
  };
}

export function decideSupportScenario(
  answer: string,
  context: string = "",
  history: HistoryItem[] = [],
  lang: AppLang = "ru",
  forcedScenario?: Scenario,
  currentStage?: string
): Scenario {
  return detectScenarioHeuristically(answer, context, history, lang, forcedScenario, currentStage).scenario;
}

export function decideSupportScenarioDetailed(
  answer: string,
  context: string = "",
  history: HistoryItem[] = [],
  lang: AppLang = "ru",
  forcedScenario?: Scenario,
  currentStage?: string
): ScenarioDetectionResult {
  return detectScenarioHeuristically(answer, context, history, lang, forcedScenario, currentStage);
}

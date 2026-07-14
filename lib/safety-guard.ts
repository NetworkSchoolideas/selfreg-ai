import type { AppLang } from "@/lib/app-i18n";
import type { ChatHistoryItem, SafetyResult } from "@/types/session";

const SELF_HARM_MARKERS = [
  "самоуб", "покончить с собой", "не хочу жить", "навредить себе", "режу себя", "убить себя",
  "suicide", "kill myself", "end my life", "do not want to live", "hurt myself", "self harm", "self-harm",
];

const IMMEDIATE_DANGER_MARKERS = [
  "мне угрожают", "мне сейчас опасно", "на меня напали", "меня избивают",
  "someone is threatening me", "i am in danger", "i'm in danger", "someone is attacking me",
];

const VIOLENCE_THREAT_MARKERS = [
  "я убью", "хочу убить", "угрожаю убить", "i will kill", "want to kill", "threaten to kill",
];

function includesAny(text: string, markers: string[]) {
  const normalized = text.toLowerCase();
  return markers.some((marker) => normalized.includes(marker));
}

function buildSafetyResult(category: SafetyResult["category"], lang: AppLang): SafetyResult {
  return {
    blocked: true,
    category,
    message:
      lang === "en"
        ? "Please pause this exercise and contact a trusted adult you can reach now. If there is immediate danger, call your local emergency number now."
        : "Пожалуйста, остановите упражнение и обратитесь к взрослому, которому вы можете доверять, прямо сейчас. Если есть непосредственная опасность, позвоните в местные экстренные службы.",
  };
}

export function detectSafetyRisk(input: {
  answer: string;
  context?: string;
  history?: ChatHistoryItem[];
  lang?: AppLang;
}): SafetyResult | null {
  const text = [
    input.answer,
    input.context || "",
    ...(input.history || []).map((item) => item.answer),
  ].join("\n");
  const lang = input.lang || "ru";

  if (includesAny(text, SELF_HARM_MARKERS)) {
    return buildSafetyResult("self_harm", lang);
  }
  if (includesAny(text, IMMEDIATE_DANGER_MARKERS)) {
    return buildSafetyResult("immediate_danger", lang);
  }
  if (includesAny(text, VIOLENCE_THREAT_MARKERS)) {
    return buildSafetyResult("violence_threat", lang);
  }

  return null;
}

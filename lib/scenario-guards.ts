import type { AppLang } from "@/lib/app-i18n";
import { RU_CLARIFY, EN_CLARIFY } from "@/lib/scenario-engine";

export function detectClarificationNeed(answer: string, lang: AppLang = "ru") {
  const normalized = answer.trim().toLowerCase();

  // Restored closer to the original working logic from the repo (balanced, not over-narrowed).
  // Clarify on short answers or common "I don't understand" phrases.
  // This is the early guard; the engine has final say with B priority.
  const veryShort = normalized.length < 3;

  const RU_CLARIFY = ["не понял", "не поняла", "не понимаю", "неясно", "объясни", "что это значит", "не знаю что ответить"];
  const EN_CLARIFY = ["don't understand", "do not understand", "not sure what you mean", "what does that mean", "unclear", "can you explain"];

  const needsClarification = veryShort || [...RU_CLARIFY, ...EN_CLARIFY].some((p) => normalized.includes(p));

  return {
    needsClarification,
    message:
      lang === "en"
        ? "The question probably sounded unclear. Let’s simplify it: choose one real situation where you want to handle yourself better and describe it in a few words."
        : "Похоже, вопрос прозвучал не совсем понятно. Давай проще: выбери одну реальную ситуацию, где хочешь справляться лучше, и опиши ее в нескольких словах."
  };
}

export function detectNonAcademicContext(text: string) {
  const normalized = text.toLowerCase();
  const markers = [
    "sport",
    "training",
    "music",
    "drawing",
    "friend",
    "chat",
    "sleep",
    "habit",
    "home",
    "family",
    "спорт",
    "трениров",
    "музык",
    "рис",
    "друз",
    "общени",
    "сон",
    "привыч",
    "дом",
    "семь"
  ];
  return { detected: markers.some((marker) => normalized.includes(marker)) };
}

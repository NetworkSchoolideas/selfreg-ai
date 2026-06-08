import type { AppLang } from "@/lib/app-i18n";
import { EN_CLARIFY, RU_CLARIFY } from "@/lib/scenario-engine";

export function detectClarificationNeed(answer: string, lang: AppLang = "ru") {
  const normalized = answer.trim().toLowerCase();
  const veryShort = normalized.length < 3;
  const markers = lang === "en" ? EN_CLARIFY : RU_CLARIFY;
  const needsClarification = veryShort || markers.some((marker) => normalized.includes(marker));

  return {
    needsClarification,
    message:
      lang === "en"
        ? "The question may have sounded unclear. Choose one real situation and write a few simple words about it."
        : "Похоже, вопрос прозвучал не совсем понятно. Выбери одну реальную ситуацию и напиши о ней несколько простых слов."
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

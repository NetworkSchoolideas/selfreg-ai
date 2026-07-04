import type { AppLang } from "@/lib/app-i18n";
import type { AnswerQualityResult } from "@/types/session";

export class AnswerValidator {
  static validateAnswer(answer: string, lang: AppLang): AnswerQualityResult {
    const trimmed = answer.trim().toLowerCase();

    if (!trimmed) {
      return {
        ok: false,
        message: lang === "en" ? "Please write an answer." : "Напиши ответ.",
      };
    }

    if (this.isTooShort(trimmed)) {
      return {
        ok: false,
        message: lang === "en"
          ? "Please write a little more so the answer is meaningful."
          : "РќР°РїРёС€Рё РЅРµРјРЅРѕРіРѕ РїРѕРґСЂРѕР±РЅРµРµ, С‡С‚РѕР±С‹ РѕС‚РІРµС‚ Р±С‹Р» РѕСЃРјС‹СЃР»РµРЅРЅС‹Рј.",
      };
    }

    if (/(.)\1{5,}/.test(trimmed)) {
      return {
        ok: false,
        message: lang === "en"
          ? "This looks like spam or testing. Please write a real answer."
          : "Похоже на спам или тест. Напиши обычный ответ о своей ситуации.",
      };
    }

    const noSpaces = trimmed.replace(/\s/g, "");
    const spamPatterns = /^(да|нет|ок|ok|123|111|aaa|хз|zzz|lol|kek|afg)+$/;

    if (spamPatterns.test(noSpaces) && noSpaces.length <= 12) {
      return {
        ok: false,
        message: lang === "en"
          ? "Please use the tool consciously. Write what is really happening for you."
          : "Используй инструмент осознанно. Напиши, что реально происходит.",
      };
    }

    return { ok: true };
  }

  static isEmpty(answer: string): boolean {
    return !answer.trim();
  }

  static isTooShort(answer: string, minLength = 3): boolean {
    return answer.trim().length < minLength;
  }
}

export const answerValidator = AnswerValidator;

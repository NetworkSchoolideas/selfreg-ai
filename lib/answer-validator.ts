import type { AppLang } from "@/lib/app-i18n";
import type { AnswerQualityResult } from "@/types/session";

/**
 * Валидатор ответов пользователя.
 * Отвечает за:
 *  - проверку на спам (повторы букв, очевидный мусор)
 *  - фильтрацию тестовых ответов ("okok", "111", "хз")
 *  - разрешение коротких честных ответов ("Не хочу", "Устал")
 *
 * Чистый слой — не зависит от React.
 */
export class AnswerValidator {
  /**
   * Проверяет качество ответа пользователя.
   *
   * @param answer Текст ответа
   * @param lang Язык интерфейса
   * @returns { ok: boolean; message?: string } — ok=false если ответ невалиден
   */
  static validateAnswer(answer: string, lang: AppLang): AnswerQualityResult {
    const trimmed = answer.trim().toLowerCase();

    if (!trimmed) {
      return {
        ok: false,
        message: lang === "en"
          ? "Please write an answer."
          : "Напиши ответ."
      };
    }

    // Проверка на спам: длинные повторы одной буквы/символа
    if (/(.)\1{5,}/.test(trimmed)) {
      return {
        ok: false,
        message: lang === "en"
          ? "This looks like spam or testing. Please write a real answer."
          : "Похоже на спам или тест. Напиши нормальный ответ."
      };
    }

    // Проверка на явные тестовые слова
    const noSpaces = trimmed.replace(/\s/g, "");
    const spamPatterns = /^(да|нет|ок|ok|123|111|aaa|хз|zzz|lol|kek|afg)+$/;

    if (spamPatterns.test(noSpaces) && noSpaces.length <= 12) {
      return {
        ok: false,
        message: lang === "en"
          ? "Please use the tool consciously. Write what is really happening for you."
          : "Пользуйся инструментом осознанно. Напиши, что реально происходит."
      };
    }

    return { ok: true };
  }

  /**
   * Проверяет, не пустой ли ответ (после trim).
   */
  static isEmpty(answer: string): boolean {
    return !answer.trim();
  }

  /**
   * Проверяет длину ответа (опционально, для UX-предупреждений).
   */
  static isTooShort(answer: string, minLength = 3): boolean {
    return answer.trim().length < minLength;
  }
}

// Экспорт для удобства
export const answerValidator = AnswerValidator;

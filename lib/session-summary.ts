import type { RecordItem } from "@/types/session";
import type { AppLang } from "@/lib/app-i18n";

/**
 * Формирует итоговое резюме (finalNote) для завершённой сессии.
 * Анализирует записи и выдаёт рекомендации.
 */
export function buildSessionSummary(context: string, records: RecordItem[], lang: AppLang): string {
  const clarifyCount = records.filter((item) => item.scenario === "clarify").length;
  const bCount = records.filter((item) => item.scenario === "B").length;
  const firstStage = records[0]?.stageTitle?.toLowerCase() || (lang === "en" ? "goal" : "цели");
  const lastStage = records[records.length - 1]?.stageTitle?.toLowerCase() || (lang === "en" ? "the next step" : "следующего шага");
  const contextLabel = context.trim() || (lang === "en" ? "selected situation" : "выбранной ситуации");

  if (clarifyCount > 0) {
    return lang === "en"
      ? `The session on "${contextLabel}" showed that the adolescent first needed simpler wording. The next priority is to keep the language concrete, move from ${firstStage} to action, and close the conversation with a clear next step.`
      : `Сессия по теме «${contextLabel}» показала, что сначала подростку понадобилась более простая формулировка вопросов. Дальше важно удерживать ясный язык, помочь перейти от ${firstStage} к действию и завершать разговор понятным следующим шагом.`;
  }

  if (bCount > 0) {
    return lang === "en"
      ? `The session on "${contextLabel}" showed episodes of excessive self-pressure. The useful line of support here is to reduce harshness, return to a realistic next step, and bring the cycle calmly to the "${lastStage}" stage.`
      : `Сессия по теме «${contextLabel}» показала эпизоды избыточного давления на себя. Полезная линия поддержки здесь — снять жесткость, вернуть реалистичный шаг и спокойно довести цикл до этапа «${lastStage}».`;
  }

  return lang === "en"
    ? `The session on "${contextLabel}" was completed without major breakdowns: the adolescent moved from ${firstStage} to the "${lastStage}" stage. The next step is to fix one manageable follow-up action and check whether the same logic holds in a real situation.`
    : `Сессия по теме «${contextLabel}» пройдена без резких сбоев: подросток смог пройти путь от ${firstStage} к этапу «${lastStage}». Дальше стоит закрепить один посильный следующий шаг и проверить, сохраняется ли эта логика в реальной ситуации.`;
}

/**
 * Формирует prompt для генерации AI-комментария по истории сессий.
 */
export function buildHistoryInsightPrompt(pastSessions: { context: string; finalNote: string; updatedAt: string }[], total: number, lang: AppLang): string {
  const latest = pastSessions[0];
  const dateStr = latest ? new Date(latest.updatedAt).toLocaleDateString(lang === "en" ? "en-US" : "ru-RU") : "";
  const latestBlock = latest
    ? `${lang === "en" ? "Most recent session" : "Последняя сессия"} (${dateStr}):\nContext: ${latest.context}\nConclusion: ${latest.finalNote}`
    : "";

  if (lang === "en") {
    return `You are a supportive AI mentor for adolescents practicing self-regulation.\n\nThe teenager has completed ${total} self-regulation session(s) in total. This is a positive achievement and sign of growing self-awareness.\n\n${latestBlock ? "Details of the latest completed session:\n" + latestBlock + "\n\n" : ""}Write a short, warm, encouraging message (3-5 sentences) in English: a greeting acknowledging their progress + 1 gentle observation from the recent session + a motivating note before they start a new cycle. Keep it concrete, non-judgmental and hopeful.`;
  }

  return `Ты — поддерживающий ИИ-наставник для подростков, практикующих саморегуляцию.\n\nПодросток уже прошёл ${total} сессий(и) саморегуляции. Это важное достижение и показатель растущей осознанности.\n\n${latestBlock ? "Детали последней завершённой сессии:\n" + latestBlock + "\n\n" : ""}Напиши короткое, тёплое и ободряющее сообщение (3-5 предложений) на русском: приветствие с признанием прогресса + 1 мягкое наблюдение из последней сессии + мотивирующее напутствие перед новой сессией. Сохраняй конкретность, без оценок и с надеждой.`;
}

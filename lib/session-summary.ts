import type { AppLang } from "@/lib/app-i18n";
import type { RecordItem } from "@/types/session";

export function buildSessionSummary(context: string, records: RecordItem[], lang: AppLang): string {
  const clarifyCount = records.filter((item) => item.scenario === "clarify").length;
  const skippedCount = records.filter((item) => item.scenario === "skipped").length;
  const bCount = records.filter((item) => item.scenario === "B").length;
  const firstStage = records[0]?.stageTitle?.toLowerCase() || (lang === "en" ? "goal" : "цели");
  const firstStageForRussianSummary = "цели";
  const lastStage = records[records.length - 1]?.stageTitle?.toLowerCase() || (lang === "en" ? "the next step" : "следующего шага");
  const contextLabel = context.trim() || (lang === "en" ? "selected situation" : "выбранной ситуации");

  if (clarifyCount > 0 || skippedCount > 0) {
    return lang === "en"
      ? `The session on "${contextLabel}" showed that the adolescent needed clearer wording or an additional attempt at one of the steps. The useful line of support is to keep questions concrete, move from ${firstStage} to action, and finish with one understandable next step.`
      : `Сессия по теме «${contextLabel}» показала, что подростку понадобилась более понятная формулировка или дополнительная попытка на одном из шагов. Полезная линия поддержки — сохранять вопросы конкретными, помогать перейти от ${firstStageForRussianSummary} к действию и завершать разговор одним понятным следующим шагом.`;
  }

  if (bCount > 0) {
    return lang === "en"
      ? `The session on "${contextLabel}" showed episodes of excessive self-pressure. The useful line of support is to reduce harshness, return to a realistic next step, and calmly bring the cycle to the "${lastStage}" stage.`
      : `Сессия по теме «${contextLabel}» показала эпизоды избыточного давления на себя. Полезная линия поддержки — снять жесткость, вернуть реалистичный следующий шаг и спокойно довести цикл до этапа «${lastStage}».`;
  }

  return lang === "en"
    ? `The session on "${contextLabel}" was completed without major breakdowns: the adolescent moved from ${firstStage} to the "${lastStage}" stage. The next step is to fix one manageable follow-up action and check whether the same logic works in a real situation.`
    : `Сессия по теме «${contextLabel}» пройдена без резких сбоев: подросток смог пройти путь от ${firstStageForRussianSummary} к этапу «${lastStage}». Дальше стоит закрепить один посильный следующий шаг и проверить, сохраняется ли эта логика в реальной ситуации.`;
}

export function buildHistoryInsightPrompt(
  pastSessions: { context: string; finalNote: string; updatedAt: string }[],
  total: number,
  lang: AppLang
): string {
  const latest = pastSessions[0];
  const dateStr = latest ? new Date(latest.updatedAt).toLocaleDateString(lang === "en" ? "en-US" : "ru-RU") : "";
  const latestBlock = latest
    ? `${lang === "en" ? "Most recent session" : "Последняя сессия"} (${dateStr}):\nContext: ${latest.context}\nConclusion: ${latest.finalNote}`
    : "";

  if (lang === "en") {
    return `You are a supportive AI mentor for adolescents practicing self-regulation.

The teenager has completed ${total} self-regulation session(s). This is a positive sign of growing self-awareness.

${latestBlock ? "Details of the latest completed session:\n" + latestBlock + "\n\n" : ""}Write a short, warm message in English: acknowledge their progress, add one concrete observation from the recent session, and give one calm recommendation before a new cycle. Use 3-5 sentences. Do not judge the adolescent as a person.`;
  }

  return `Ты поддерживающий ИИ-наставник для подростков, которые тренируют саморегуляцию.

Подросток уже прошел ${total} сессий саморегуляции. Это важный признак растущей осознанности.

${latestBlock ? "Детали последней завершенной сессии:\n" + latestBlock + "\n\n" : ""}Напиши короткое теплое сообщение на русском: признай прогресс, добавь одно конкретное наблюдение из последней сессии и дай одну спокойную рекомендацию перед новым циклом. Используй 3-5 предложений. Не оценивай подростка как личность.`;
}

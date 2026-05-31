import type { AppLang } from "@/lib/app-i18n";

export type StageId = "1" | "2" | "3" | "4" | "5";
export type Scenario = "A" | "B" | "clarify" | "skipped";

export type StageMeta = {
  id: StageId;
  title: string;
  shortTitle: string;
  teenDescription: string;
  teacherSignal: string;
  questions: string[];
};

type StageCopy = {
  id: StageId;
  title: { ru: string; en: string };
  shortTitle: { ru: string; en: string };
  teenDescription: { ru: string; en: string };
  teacherSignal: { ru: string; en: string };
  questions: { ru: string[]; en: string[] };
};

const STAGE_ORDER: StageId[] = ["1", "2", "3", "4", "5"];

const STAGES: StageCopy[] = [
  {
    id: "1",
    title: { ru: "Цель", en: "Goal" },
    shortTitle: { ru: "Понять, что сейчас важно", en: "Clarify what matters now" },
    teenDescription: {
      ru: "Выбрать одну ситуацию, с которой хочется справляться спокойнее и точнее.",
      en: "Choose one situation you want to handle more calmly and clearly."
    },
    teacherSignal: {
      ru: "Смотрим, может ли подросток назвать личную и понятную цель.",
      en: "We check whether the adolescent can name a personal and clear goal."
    },
    questions: {
      ru: [
        "Что сейчас важнее всего сдвинуть с места?",
        "В какой ситуации ты хочешь справляться лучше на этой неделе?",
        "Если выбрать только одну вещь, что ты хочешь улучшить в ближайшее время?"
      ],
      en: [
        "What matters most to move forward right now?",
        "In what situation do you want to handle yourself better this week?",
        "If you choose only one thing, what do you want to improve next?"
      ]
    }
  },
  {
    id: "2",
    title: { ru: "Переход к действию", en: "Move to action" },
    shortTitle: { ru: "Найти первый шаг", en: "Find the first step" },
    teenDescription: {
      ru: "Выбрать действие, которое реально можно сделать в ближайшее время.",
      en: "Choose an action that is realistic in the near future."
    },
    teacherSignal: {
      ru: "Смотрим, появляется ли переход от намерения к действию.",
      en: "We check whether the adolescent can move from intention to action."
    },
    questions: {
      ru: [
        "Какой самый маленький шаг можно сделать прямо сейчас?",
        "Что займет 5-10 минут и немного продвинет тебя вперед?",
        "С чего можно начать без идеального настроя?"
      ],
      en: [
        "What is the smallest step you can take right now?",
        "What would take 5 to 10 minutes and move you a little forward?",
        "What can you start without waiting for the perfect mood?"
      ]
    }
  },
  {
    id: "3",
    title: { ru: "Обратная связь", en: "Feedback" },
    shortTitle: { ru: "Понять сигнал", en: "Make sense of feedback" },
    teenDescription: {
      ru: "Разобраться, что полезного можно взять из комментария, результата или ошибки.",
      en: "Figure out what is useful in a comment, result, or mistake."
    },
    teacherSignal: {
      ru: "Смотрим, воспринимается ли обратная связь как данные для действия, а не как удар по личности.",
      en: "We check whether feedback is treated as usable information rather than a personal attack."
    },
    questions: {
      ru: [
        "Какой сигнал или комментарий ты уже получил по этой ситуации?",
        "Что из замечания или результата поможет сделать следующий шаг точнее?",
        "Что здесь факт, а что твоя реакция на этот факт?"
      ],
      en: [
        "What signal or comment have you already received in this situation?",
        "What in that result or comment can help your next step?",
        "What here is a fact, and what is your reaction to that fact?"
      ]
    }
  },
  {
    id: "4",
    title: { ru: "Сличение", en: "Comparison" },
    shortTitle: { ru: "Сравнить с целью", en: "Compare with the goal" },
    teenDescription: {
      ru: "Проверить, совпадает ли текущее действие с тем, чего ты хотел добиться.",
      en: "Check whether the current action matches what you wanted to achieve."
    },
    teacherSignal: {
      ru: "Смотрим, может ли подросток сопоставить действие, критерий и результат.",
      en: "We check whether the adolescent can compare action, criteria, and result."
    },
    questions: {
      ru: [
        "Если сравнить результат с целью: что совпало, а что нет?",
        "То, что получилось, приближает тебя туда, куда ты хотел?",
        "Где есть расхождение между планом и тем, что вышло?"
      ],
      en: [
        "If you compare the result with the goal, what matches and what does not?",
        "Does what happened move you where you wanted to go?",
        "Where do you see a gap between the plan and the result?"
      ]
    }
  },
  {
    id: "5",
    title: { ru: "Коррекция", en: "Adjustment" },
    shortTitle: { ru: "Попробовать иначе", en: "Try a better next attempt" },
    teenDescription: {
      ru: "Выбрать, что изменить в следующей попытке без самокритики и резкого давления.",
      en: "Choose what to change in the next attempt without harsh self-pressure."
    },
    teacherSignal: {
      ru: "Смотрим, появляется ли реалистичная корректировка, а не отказ или самообвинение.",
      en: "We check whether there is a realistic adjustment instead of withdrawal or self-blame."
    },
    questions: {
      ru: [
        "Что стоит попробовать иначе в следующей попытке?",
        "Какой один шаг сделает следующий вариант немного лучше?",
        "Что можно упростить, убрать или изменить, чтобы продолжать было легче?"
      ],
      en: [
        "What is worth trying differently next time?",
        "What one step would make the next attempt slightly better?",
        "What can you simplify, remove, or change to make it easier to continue?"
      ]
    }
  }
];

function pick<T>(lang: AppLang, value: { ru: T; en: T }): T {
  return lang === "en" ? value.en : value.ru;
}

export function getStageMeta(stageId: StageId, lang: AppLang = "ru"): StageMeta {
  const stage = STAGES.find((item) => item.id === stageId)!;
  return {
    id: stage.id,
    title: pick(lang, stage.title),
    shortTitle: pick(lang, stage.shortTitle),
    teenDescription: pick(lang, stage.teenDescription),
    teacherSignal: pick(lang, stage.teacherSignal),
    questions: pick(lang, stage.questions)
  };
}

export function getStageOrder() {
  return [...STAGE_ORDER];
}

export function getNextStage(stage: StageId): StageId {
  const index = STAGE_ORDER.indexOf(stage);
  return STAGE_ORDER[(index + 1) % STAGE_ORDER.length];
}

export function getStageQuestion(
  stageId: StageId,
  context = "",
  history: Array<{ answer: string; scenario?: string }> = [],
  lang: AppLang = "ru"
) {
  const stage = getStageMeta(stageId, lang);

  // Only count "real" (A/B) answers for question rotation.
  // Clarify/skip records should not pollute the question variety on later stages.
  const realProgress = history.filter(h => h.scenario === "A" || h.scenario === "B").length;

  const seed = (context.trim().length + realProgress) % stage.questions.length;
  return stage.questions[seed];
}

type MockInput = {
  stageId: StageId;
  answer: string;
  context: string;
  history: Array<{ answer: string }>;
  lang?: AppLang;
  /** Absolute scenario from scenario-engine (highest priority) */
  forcedScenario?: Scenario;
};

export function makeMockFeedback(input: MockInput) {
  const lang = input.lang || "ru";

  // SCENARIO OWNERSHIP: forcedScenario (from scenario-engine via route) is absolute.
  // The legacy detectScenario is intentionally NOT called anymore in any production path.
  // If somehow forcedScenario is missing, we default to "A" (most common safe support type).
  const scenario: Scenario = input.forcedScenario ?? "A";
  const stage = getStageMeta(input.stageId, lang);
  const contextText = `${input.context} ${input.answer}`.toLowerCase();
  const nonAcademic = /sport|training|music|art|friend|chat|habit|sleep|home|family|спорт|трениров|музык|рис|друз|общени|привыч|сон|дом|семь/i.test(
    contextText
  );
  const contextTail =
    lang === "en"
      ? nonAcademic
        ? "This does not have to be only about school: the same self-regulation logic also works for sports, creativity, communication, and habits."
        : "Use this answer as material for the next step."
      : nonAcademic
        ? "Это не обязательно только про учебу: та же логика саморегуляции работает в спорте, творчестве, общении и привычках."
        : "Этот ответ уже можно использовать как материал для следующего шага.";

  if (scenario === "clarify") {
    // Make the clarify message slightly stage-aware so it doesn't feel like the same generic message on every step.
    const stageHint = lang === "en"
      ? `Focus on the "${stage.title}" stage for now.`
      : `Сейчас сосредоточься на этапе «${stage.title}».`;

    return {
      scenario,
      feedback:
        lang === "en"
          ? `The question felt too broad. ${stageHint} Write 1-2 concrete sentences about your real situation.`
          : `Похоже, вопрос прозвучал слишком широко. ${stageHint} Напиши 1-2 конкретных предложения про твою реальную ситуацию.`,
      finalNote:
        lang === "en"
          ? "At this point the key is not precision, but a clear entry into the dialogue with simple language."
          : "На этом этапе важнее не точность ответа, а понятный вход в диалог простым языком."
    };
  }

  const feedbackA: Record<StageId, string> = {
    "1":
      lang === "en"
        ? `There is already something to work with. At the "${stage.title}" stage, it helps to narrow this down to one concrete situation and one realistic result. ${contextTail}`
        : `Здесь уже есть за что зацепиться. На этапе «${stage.title}» полезно сузить ответ до одной конкретной ситуации и одного реалистичного результата. ${contextTail}`,
    "2":
      lang === "en"
        ? `A small entry point helps here. At the "${stage.title}" stage, choose an action that can be done in 5 to 10 minutes without extra preparation. ${contextTail}`
        : `Сейчас помогает маленький вход. На этапе «${stage.title}» лучше выбрать действие, которое можно сделать за 5-10 минут без лишней подготовки. ${contextTail}`,
    "3":
      lang === "en"
        ? `Right now it is more useful to separate the signal from the emotion. At the "${stage.title}" stage, take only the part of the feedback that can improve your next step. ${contextTail}`
        : `Сейчас полезнее отделить сам сигнал от эмоции. На этапе «${stage.title}» попробуй взять из обратной связи только то, что поможет следующему шагу. ${contextTail}`,
    "4":
      lang === "en"
        ? `At this stage it is enough to compare one thing that matched and one thing that did not. That makes the gap visible without turning it into a harsh judgment. ${contextTail}`
        : `На этом этапе достаточно найти одно совпадение и одно расхождение. Так становится видно, где именно есть зазор, без жесткого общего вывода. ${contextTail}`,
    "5":
      lang === "en"
        ? `You do not need a full rebuild here. At the "${stage.title}" stage, one manageable adjustment is enough to make the next attempt easier or more accurate. ${contextTail}`
        : `Здесь не нужен полный передел. На этапе «${stage.title}» достаточно одной посильной корректировки, чтобы следующая попытка стала легче или точнее. ${contextTail}`
  };

  const feedbackB: Record<StageId, string> = {
    "1":
      lang === "en"
        ? `There is too much pressure in how the goal is framed. At the "${stage.title}" stage, it is better to loosen the demand and define a realistic focus instead of an ideal outcome. ${contextTail}`
        : `В том, как сформулирована цель, сейчас слишком много давления. На этапе «${stage.title}» лучше ослабить требование и выбрать реалистичный фокус вместо идеального результата. ${contextTail}`,
    "2":
      lang === "en"
        ? `There is a risk of either freezing or pushing too hard. At the "${stage.title}" stage, remove pressure and choose the smallest step that can definitely be done calmly. ${contextTail}`
        : `Сейчас есть риск или застыть, или рвануть слишком резко. На этапе «${stage.title}» лучше убрать давление и выбрать минимальный шаг, который точно можно выполнить спокойно. ${contextTail}`,
    "3":
      lang === "en"
        ? `The feedback seems to hit too hard. At the "${stage.title}" stage, return to facts: what exactly was said, and what part of it can actually help the next step. ${contextTail}`
        : `Похоже, обратная связь задевает слишком сильно. На этапе «${stage.title}» полезно вернуться к фактам: что именно было сказано и что из этого поможет следующему шагу. ${contextTail}`,
    "4":
      lang === "en"
        ? `The result is being judged too harshly. At the "${stage.title}" stage, do not make a global verdict yet; check one concrete criterion first. ${contextTail}`
        : `Результат сейчас оценивается слишком жестко. На этапе «${stage.title}» не стоит выносить общий приговор; лучше проверить один конкретный критерий. ${contextTail}`,
    "5":
      lang === "en"
        ? `Now is not the time for a total rewrite under pressure. At the "${stage.title}" stage, one soft adjustment is more useful than rebuilding everything at once. ${contextTail}`
        : `Сейчас не время для полного передела под давлением. На этапе «${stage.title}» одна мягкая корректировка полезнее, чем попытка переделать все сразу. ${contextTail}`
  };

  return {
    scenario,
    feedback: scenario === "B" ? feedbackB[input.stageId] : feedbackA[input.stageId],
    finalNote:
      lang === "en"
        ? "The session shows where temporary support is needed: clarify the goal, move to the first action, process feedback calmly, compare the result with the plan, and choose the next adjustment."
        : "По сессии видно, где нужна временная опора: уточнить цель, перейти к первому действию, спокойно разобрать обратную связь, сравнить результат с планом и выбрать следующую корректировку."
  };
}

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



const QUESTION_VARIANTS: Partial<Record<StageId, Partial<Record<Scenario | "default", { ru: string[]; en: string[] }>>>> = {
  "1": {
    A: {
      ru: [
        "Какую одну реальную ситуацию ты хочешь улучшить в ближайшее время?",
        "Если выбрать только один фокус, что для тебя сейчас действительно важно?"
      ],
      en: [
        "What one real situation do you want to improve in the near future?",
        "If you choose only one focus, what actually matters to you now?"
      ]
    },
    B: {
      ru: [
        "Без жестких требований к себе: что для тебя правда важно, кроме идеального результата?",
        "Если убрать давление, какую цель можно назвать реалистичной и своей?"
      ],
      en: [
        "Without harsh pressure on yourself, what really matters besides the ideal outcome?",
        "If you remove pressure, what goal would feel realistic and truly yours?"
      ]
    },
    clarify: {
      ru: [
        "Назови просто одну ситуацию: учеба, спорт, общение, проект или привычка.",
        "Можно совсем коротко: где именно ты хочешь справляться лучше?"
      ],
      en: [
        "Name just one situation: study, sport, communication, project, or habit.",
        "You can answer very briefly: where exactly do you want to handle things better?"
      ]
    }
  },
  "2": {
    A: {
      ru: [
        "Какой маленький шаг можно сделать без лишней подготовки уже сегодня?",
        "Что займет 5-10 минут и даст нормальный старт?"
      ],
      en: [
        "What small step can you take today without extra preparation?",
        "What would take 5 to 10 minutes and give you a workable start?"
      ]
    },
    B: {
      ru: [
        "Чтобы не давить на себя, какой шаг можно сделать совсем маленьким и посильным?",
        "Если убрать рывок и перегрузку, с какого спокойного шага лучше начать?"
      ],
      en: [
        "To reduce pressure, what step can you make very small and manageable?",
        "If you remove the rush and overload, what calm first step makes more sense?"
      ]
    },
    clarify: {
      ru: [
        "Напиши одно простое действие, которое реально сделать в ближайшее время.",
        "Можно ответить совсем коротко: что именно ты сделаешь первым?"
      ],
      en: [
        "Write one simple action that is realistic in the near future.",
        "You can answer very briefly: what exactly will you do first?"
      ]
    }
  },
  "3": {
    A: {
      ru: [
        "Какой комментарий, сигнал или результат тут уже можно использовать с пользой?",
        "Что из обратной связи поможет сделать следующий шаг точнее?"
      ],
      en: [
        "What comment, signal, or result here can already be used in a helpful way?",
        "What part of the feedback can make the next step more precise?"
      ]
    },
    B: {
      ru: [
        "Если реакция задевает слишком сильно, что здесь факт, а что уже самообвинение?",
        "Какую часть обратной связи можно взять спокойно, без удара по себе?"
      ],
      en: [
        "If the reaction hits too hard, what here is a fact and what is already self-attack?",
        "What part of the feedback can you take calmly, without turning it against yourself?"
      ]
    },
    clarify: {
      ru: [
        "Назови один комментарий, замечание или результат, на который ты сейчас смотришь.",
        "Можно коротко: какой именно сигнал ты здесь получил?"
      ],
      en: [
        "Name one comment, remark, or result you are looking at right now.",
        "You can answer briefly: what exact signal did you receive here?"
      ]
    }
  },
  "4": {
    A: {
      ru: [
        "Если сравнить результат с целью, что совпало и что пока не совпало?",
        "Где видно одно конкретное совпадение и одно расхождение?"
      ],
      en: [
        "If you compare the result with the goal, what matched and what did not yet match?",
        "Where do you see one concrete match and one concrete mismatch?"
      ]
    },
    B: {
      ru: [
        "Без общего жесткого вывода: какой один критерий можно сейчас спокойно проверить?",
        "Если не обнулять все сразу, где именно видно одно расхождение?"
      ],
      en: [
        "Without making a harsh overall verdict, what one criterion can you check calmly right now?",
        "If you do not cancel everything at once, where exactly do you see one mismatch?"
      ]
    },
    clarify: {
      ru: [
        "Скажи проще: если сравнить цель и результат, где они не совпали?",
        "Можно одним предложением: что здесь вышло не так, как ты хотел?"
      ],
      en: [
        "Say it more simply: if you compare the goal and the result, where did they not match?",
        "You can answer in one sentence: what here turned out differently from what you wanted?"
      ]
    }
  },
  "5": {
    A: {
      ru: [
        "Что можно немного изменить в следующей попытке, чтобы стало легче или точнее?",
        "Какой один следующий вариант будет лучше без лишнего давления?"
      ],
      en: [
        "What can you adjust a little in the next attempt so it becomes easier or more precise?",
        "What one next version would be better without extra pressure?"
      ]
    },
    B: {
      ru: [
        "Не полный передел: какую одну мягкую корректировку лучше выбрать сейчас?",
        "Если не ломать все заново, что можно изменить в следующей попытке совсем точечно?"
      ],
      en: [
        "Not a full rebuild: what one soft adjustment would make more sense now?",
        "If you do not rebuild everything again, what can you change in the next attempt in one focused way?"
      ]
    },
    clarify: {
      ru: [
        "Назови одно изменение, которое стоит попробовать в следующий раз.",
        "Можно совсем коротко: что ты попробуешь сделать иначе?"
      ],
      en: [
        "Name one change worth trying next time.",
        "You can answer very briefly: what will you try to do differently?"
      ]
    }
  }
};


type QuestionHistoryItem = { stageId?: string; answer: string; scenario?: string; eventType?: string };
type QuestionFocusKey =
  | "b-action-from-rigid-goal"
  | "b-action-stuck"
  | "b-action-rush"
  | "b-feedback-self-attack"
  | "b-comparison-collapse"
  | "b-correction-rebuild";

const QUESTION_FOCUS_VARIANTS: Partial<Record<StageId, Partial<Record<QuestionFocusKey, { ru: string[]; en: string[] }>>>> = {
  "2": {
    "b-action-from-rigid-goal": {
      ru: [
        "После жесткой цели лучше начать без давления: какой самый маленький шаг можно сделать спокойно?",
        "Что можно сделать первым, чтобы приблизиться к цели без требования сделать все идеально?"
      ],
      en: [
        "After a rigid goal, start without pressure: what is the smallest step you can take calmly?",
        "What can you do first to move toward the goal without needing everything to be perfect?"
      ]
    },
    "b-action-stuck": {
      ru: [
        "Если ты застрял, какой шаг можно сделать настолько маленьким, чтобы начать было почти не страшно?",
        "Что можно сделать за 5 минут, чтобы выйти из откладывания без рывка и давления?"
      ],
      en: [
        "If you are stuck, what step can be small enough that starting feels almost safe?",
        "What can you do in 5 minutes to move out of postponing without a rush or pressure?"
      ]
    },
    "b-action-rush": {
      ru: [
        "Если хочется резко сделать все сразу, какой один спокойный шаг лучше выбрать первым?",
        "Что можно сделать сейчас без рывка, чтобы не перегрузить себя в самом начале?"
      ],
      en: [
        "If you want to do everything at once, what one calm step should come first?",
        "What can you do now without rushing, so you do not overload yourself at the start?"
      ]
    }
  },
  "3": {
    "b-feedback-self-attack": {
      ru: [
        "Что в обратной связи было фактом, а что стало болезненной оценкой себя?",
        "Какую одну полезную часть замечания можно взять без самообвинения?"
      ],
      en: [
        "What in the feedback was a fact, and what turned into a painful judgment of yourself?",
        "What one useful part of the comment can you take without self-blame?"
      ]
    }
  },
  "4": {
    "b-comparison-collapse": {
      ru: [
        "Не обнуляя всю работу, где видно одно совпадение с целью и одно расхождение?",
        "Какой один критерий можно спокойно проверить, чтобы сравнение стало точнее?"
      ],
      en: [
        "Without cancelling the whole effort, where do you see one match with the goal and one mismatch?",
        "What one criterion can you check calmly so the comparison becomes more precise?"
      ]
    }
  },
  "5": {
    "b-correction-rebuild": {
      ru: [
        "Не переделывая все с нуля, какую одну точечную правку стоит попробовать?",
        "Что можно изменить мягко и конкретно, чтобы следующая попытка стала лучше?"
      ],
      en: [
        "Without rebuilding everything from zero, what one focused adjustment is worth trying?",
        "What can you change gently and specifically so the next attempt becomes better?"
      ]
    }
  }
};

function normalizeQuestionText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function includesAny(text: string, markers: string[]): boolean {
  return markers.some((marker) => text.includes(marker));
}

function getLastProgressItem(history: QuestionHistoryItem[]): QuestionHistoryItem | undefined {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const item = history[index];
    if (item.scenario === "A" || item.scenario === "B") return item;
  }
  return undefined;
}

function getQuestionFocusHint(stageId: StageId, history: QuestionHistoryItem[]): QuestionFocusKey | undefined {
  const lastProgress = getLastProgressItem(history);
  if (!lastProgress) return undefined;

  const answer = normalizeQuestionText(lastProgress.answer || "");
  const wasB = lastProgress.scenario === "B";

  const rigidGoal = includesAny(answer, [
    "только пятер", "только 5", "любой ценой", "идеально", "доказать всем", "only top grade", "only an a", "at any cost", "perfect"
  ]);
  const stuck = includesAny(answer, [
    "застр", "отклады", "не начну", "не могу начать", "потом", "stuck", "postpon", "can't start", "cannot start", "later"
  ]);
  const rush = includesAny(answer, [
    "сразу все", "сразу всё", "срочно", "рывок", "не буду думать", "everything at once", "rush", "urgent", "without thinking"
  ]);
  const selfAttack = includesAny(answer, [
    "я плох", "я туп", "я глуп", "полный ноль", "лучше молч", "стыд", "i am bad", "i am stupid", "total zero", "better stay silent", "shame"
  ]);
  const collapse = includesAny(answer, [
    "все зря", "всё зря", "нигде", "ничего не вышло", "полный ноль", "обнул", "nothing matched", "nothing worked", "everything was pointless", "total failure"
  ]);
  const rebuild = includesAny(answer, [
    "переделаю все", "переделаю всё", "с нуля", "брошу", "сдамся", "redo everything", "from zero", "quit", "give up"
  ]);

  if (stageId === "2" && rigidGoal) return "b-action-from-rigid-goal";
  if (stageId === "2" && stuck) return "b-action-stuck";
  if (stageId === "2" && (rush || wasB)) return "b-action-rush";
  if (stageId === "3" && (selfAttack || wasB)) return "b-feedback-self-attack";
  if (stageId === "4" && (collapse || wasB)) return "b-comparison-collapse";
  if (stageId === "5" && (rebuild || wasB)) return "b-correction-rebuild";

  return undefined;
}
function getQuestionScenarioHint(
  stageId: StageId,
  history: Array<{ stageId?: string; answer: string; scenario?: string; eventType?: string }>
): Scenario | "default" {
  if (history.length === 0) return "default";

  for (let index = history.length - 1; index >= 0; index -= 1) {
    const item = history[index];
    if (item.stageId === stageId && item.scenario === "clarify") {
      return "clarify";
    }
    if (item.stageId === stageId && item.eventType === "back") {
      return "clarify";
    }
    if (item.scenario === "A" || item.scenario === "B") {
      return item.scenario;
    }
  }

  return "default";
}

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
  history: Array<{ stageId?: string; answer: string; scenario?: string; eventType?: string }> = [],
  lang: AppLang = "ru"
) {
  const stage = getStageMeta(stageId, lang);
  const realProgress = history.filter((h) => h.scenario === "A" || h.scenario === "B").length;
  const scenarioHint = getQuestionScenarioHint(stageId, history);
  const focusHint = getQuestionFocusHint(stageId, history);
  const variantPool =
    (focusHint ? QUESTION_FOCUS_VARIANTS[stageId]?.[focusHint]?.[lang] : undefined) ||
    QUESTION_VARIANTS[stageId]?.[scenarioHint]?.[lang] ||
    QUESTION_VARIANTS[stageId]?.default?.[lang] ||
    stage.questions;
  const seed = (context.trim().length + realProgress + variantPool.length) % variantPool.length;
  return variantPool[seed];
}

type MockInput = {
  stageId: StageId;
  answer: string;
  context: string;
  history: Array<{ answer: string }>;
  lang?: AppLang;
  forcedScenario?: Scenario;
};

function isNonAcademicContext(text: string) {
  return /sport|training|music|art|friend|chat|habit|sleep|home|family|спорт|трениров|музык|рис|друз|общени|привыч|сон|дом|семь/i.test(text);
}

export function makeMockFeedback(input: MockInput) {
  const lang = input.lang || "ru";
  const scenario: Scenario = input.forcedScenario ?? "A";
  const stage = getStageMeta(input.stageId, lang);
  const contextText = `${input.context} ${input.answer}`.toLowerCase();
  const nonAcademic = isNonAcademicContext(contextText);
  const contextTail =
    lang === "en"
      ? nonAcademic
        ? "This does not have to be only about school: the same self-regulation logic also works for sports, creativity, communication, and habits."
        : "Use this answer as material for the next step."
      : nonAcademic
        ? "Это не обязательно только про учебу: та же логика саморегуляции работает в спорте, творчестве, общении и привычках."
        : "Этот ответ уже можно использовать как материал для следующего шага.";

  if (scenario === "clarify") {
    const stageHint =
      lang === "en"
        ? `Focus on the "${stage.title}" stage for now.`
        : `Сейчас сосредоточься на этапе «${stage.title}».`;

    return {
      scenario,
      feedback:
        lang === "en"
          ? `The question felt too broad. ${stageHint} Write 1-2 concrete sentences about your real situation.`
          : `Похоже, вопрос прозвучал слишком широко. ${stageHint} Напиши 1-2 конкретных предложения про свою реальную ситуацию.`,
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
        : `Здесь уже есть материал для работы. На этапе «${stage.title}» полезно сузить ответ до одной конкретной ситуации и одного реалистичного результата. ${contextTail}`,
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


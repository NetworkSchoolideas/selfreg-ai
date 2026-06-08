const baseUrl = process.env.SELFREG_BASE_URL || "http://localhost:3000";

async function postScenario({
  label,
  answer,
  currentStage = "2",
  context = "учебный проект",
  expectedScenario,
  lang = "ru",
  history = []
}) {
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      userId: `scenario-${label}`,
      answer,
      currentStage,
      context,
      provider: "mock",
      lang,
      history
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`${label} failed with ${response.status}: ${JSON.stringify(data)}`);
  }

  if (data.scenario !== expectedScenario) {
    throw new Error(
      `${label} expected scenario ${expectedScenario}, got ${data.scenario}. Feedback: ${data.feedback}`
    );
  }

  return {
    label,
    scenario: data.scenario,
    nextStage: data.nextStage,
    feedback: data.feedback
  };
}

const results = [];

results.push(
  await postScenario({
    label: "stage1-goal-rigidity-b",
    answer: "Мне нужна только пятерка любой ценой, иначе это провал.",
    currentStage: "1",
    expectedScenario: "B"
  })
);

results.push(
  await postScenario({
    label: "stage2-structured-support-a",
    answer: "Хочу спокойно начать с первого маленького шага и не перегрузить себя.",
    currentStage: "2",
    expectedScenario: "A"
  })
);

results.push(
  await postScenario({
    label: "stage2-pressure-b",
    answer: "Я обязан сделать идеально, иначе это будет полный провал и позор.",
    currentStage: "2",
    expectedScenario: "B"
  })
);

results.push(
  await postScenario({
    label: "stage3-feedback-defensive-b",
    answer: "После замечания кажется, что я полный ноль и лучше молчать.",
    currentStage: "3",
    expectedScenario: "B"
  })
);

results.push(
  await postScenario({
    label: "stage4-comparison-collapse-b",
    answer: "Нигде не совпало, все зря.",
    currentStage: "4",
    expectedScenario: "B"
  })
);

results.push(
  await postScenario({
    label: "stage5-adjustment-collapse-b",
    answer: "Переделаю все с нуля или просто брошу.",
    currentStage: "5",
    expectedScenario: "B"
  })
);

results.push(
  await postScenario({
    label: "scenario-b-short-but-meaningful",
    answer: "Страшно, провал.",
    currentStage: "3",
    expectedScenario: "B"
  })
);

results.push(
  await postScenario({
    label: "scenario-clarify-question",
    answer: "Не понял вопрос.",
    currentStage: "1",
    expectedScenario: "clarify"
  })
);

results.push(
  await postScenario({
    label: "scenario-non-academic-context",
    answer: "На тренировке хочу не срываться после ошибки и сделать следующий спокойный шаг.",
    currentStage: "2",
    context: "спорт",
    expectedScenario: "A"
  })
);

results.push(
  await postScenario({
    label: "scenario-retry-after-clarify-does-not-loop",
    answer: "Экзамен",
    currentStage: "1",
    expectedScenario: "A",
    history: [
      {
        stage: "1",
        answer: "Не понял вопрос.",
        feedback: "Похоже, вопрос прозвучал не совсем понятно.",
        scenario: "clarify",
        eventType: "clarify_request"
      }
    ]
  })
);

results.push(
  await postScenario({
    label: "scenario-en-stage4-b",
    answer: "Nothing matched, it feels like total failure.",
    currentStage: "4",
    context: "exam",
    expectedScenario: "B",
    lang: "en"
  })
);

console.log(JSON.stringify({ ok: true, results }, null, 2));

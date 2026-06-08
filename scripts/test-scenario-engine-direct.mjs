import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const sourcePath = new URL("../lib/scenario-engine.ts", import.meta.url);
const source = fs.readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
});

const testModule = { exports: {} };
const sandbox = {
  module: testModule,
  exports: testModule.exports,
  require() {
    return {};
  },
};

vm.runInNewContext(compiled.outputText, sandbox, { filename: "scenario-engine.js" });

const { decideSupportScenarioDetailed } = testModule.exports;

const cases = [
  {
    label: "stage1-rigid-goal-b",
    answer: "Мне нужна только пятерка любой ценой, иначе это провал.",
    currentStage: "1",
    expected: "B",
    expectedSignal: "stage-1-risk",
  },
  {
    label: "stage1-short-but-meaningful-a",
    answer: "Экзамен",
    currentStage: "1",
    expected: "A",
  },
  {
    label: "stage2-stuck-b",
    answer: "Я застрял и опять откладываю, потом попробую.",
    currentStage: "2",
    expected: "B",
    expectedSignal: "stage-2-risk",
  },
  {
    label: "stage2-healthy-action-a",
    answer: "Сначала открою файл и сделаю черновой план на 10 минут.",
    currentStage: "2",
    expected: "A",
  },
  {
    label: "stage3-self-attack-b",
    answer: "После замечания кажется, что я полный ноль и лучше молчать.",
    currentStage: "3",
    expected: "B",
    expectedSignal: "stage-3-risk",
  },
  {
    label: "stage3-useful-feedback-a",
    answer: "Я понял, что в работе слабое место в аргументации, это можно поправить.",
    currentStage: "3",
    expected: "A",
  },
  {
    label: "stage4-all-or-nothing-b",
    answer: "Нигде не совпало, все зря.",
    currentStage: "4",
    expected: "B",
    expectedSignal: "stage-4-risk",
  },
  {
    label: "stage4-concrete-gap-a",
    answer: "Структура совпала, но вывод пока слабее, чем я хотел.",
    currentStage: "4",
    expected: "A",
  },
  {
    label: "stage5-total-rebuild-b",
    answer: "Переделаю все с нуля или брошу.",
    currentStage: "5",
    expected: "B",
    expectedSignal: "stage-5-risk",
  },
  {
    label: "stage5-soft-adjustment-a",
    answer: "В следующий раз сначала сделаю план, а потом уже оформление.",
    currentStage: "5",
    expected: "A",
  },
  {
    label: "clarify-plain",
    answer: "Не понял вопрос.",
    currentStage: "1",
    expected: "clarify",
    expectedSignal: "clarify-marker",
  },
  {
    label: "clarify-too-vague",
    answer: "Ну да",
    currentStage: "2",
    expected: "clarify",
    expectedSignal: "too-vague",
  },
  {
    label: "retry-after-clarify-short-meaningful-a",
    answer: "Экзамен",
    currentStage: "1",
    expected: "A",
    history: [
      {
        stage: "1",
        answer: "Не понял вопрос.",
        feedback: "Скажи проще, где именно тебе хочется справляться лучше.",
        scenario: "clarify",
        eventType: "clarify_request",
      },
    ],
  },
  {
    label: "non-academic-context-a",
    answer: "Хочу спокойнее вести себя на тренировке и не срываться после ошибки.",
    currentStage: "1",
    context: "спорт",
    expected: "A",
  },
  {
    label: "english-stage4-b",
    answer: "Nothing matched, it feels like total failure.",
    currentStage: "4",
    context: "exam",
    lang: "en",
    expected: "B",
    expectedSignal: "stage-4-risk",
  },
];

const results = cases.map((item) => {
  const result = decideSupportScenarioDetailed(
    item.answer,
    item.context || "учебный проект",
    item.history || [],
    item.lang || "ru",
    undefined,
    item.currentStage
  );

  assert(
    result.scenario === item.expected,
    `${item.label}: expected ${item.expected}, got ${result.scenario}. reason=${result.reason}`
  );

  if (item.expectedSignal) {
    assert(
      result.signals.includes(item.expectedSignal),
      `${item.label}: expected signal ${item.expectedSignal}, got ${JSON.stringify(result.signals)}`
    );
  }

  return {
    label: item.label,
    scenario: result.scenario,
    signals: result.signals,
    reason: result.reason,
  };
});

console.log(JSON.stringify({ ok: true, results }, null, 2));

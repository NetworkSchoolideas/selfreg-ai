import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const sourcePath = new URL("../lib/selfreg-model.ts", import.meta.url);
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

vm.runInNewContext(compiled.outputText, sandbox, { filename: "selfreg-model.js" });

const { getStageQuestion } = testModule.exports;

const cases = [
  {
    label: "stage1-default-en",
    actual: getStageQuestion("1", "exam", [], "en"),
    allowed: [
      "What matters most to move forward right now?",
      "In what situation do you want to handle yourself better this week?",
      "If you choose only one thing, what do you want to improve next?",
    ],
  },
  {
    label: "stage1-b-history-en",
    actual: getStageQuestion("1", "exam", [
      { stageId: "1", answer: "I must get a perfect result", scenario: "B", eventType: "answer" },
    ], "en"),
    allowed: [
      "Without harsh pressure on yourself, what really matters besides the ideal outcome?",
      "If you remove pressure, what goal would feel realistic and truly yours?",
    ],
  },
  {
    label: "stage1-clarify-en",
    actual: getStageQuestion("1", "exam", [
      { stageId: "1", answer: "I don't understand", scenario: "clarify", eventType: "clarify_request" },
    ], "en"),
    allowed: [
      "Name just one situation: study, sport, communication, project, or habit.",
      "You can answer very briefly: where exactly do you want to handle things better?",
    ],
  },
  {
    label: "stage2-back-en",
    actual: getStageQuestion("2", "project", [
      { stageId: "2", answer: "Going back", scenario: "clarify", eventType: "back" },
    ], "en"),
    allowed: [
      "Write one simple action that is realistic in the near future.",
      "You can answer very briefly: what exactly will you do first?",
    ],
  },
  {
    label: "stage2-after-rigid-goal-ru",
    actual: getStageQuestion("2", "экзамен", [
      { stageId: "1", answer: "Мне нужна только пятерка любой ценой, иначе провал", scenario: "B", eventType: "answer" },
    ], "ru"),
    allowed: [
      "После жесткой цели лучше начать без давления: какой самый маленький шаг можно сделать спокойно?",
      "Что можно сделать первым, чтобы приблизиться к цели без требования сделать все идеально?",
    ],
  },
  {
    label: "stage2-after-stuck-ru",
    actual: getStageQuestion("2", "проект", [
      { stageId: "2", answer: "Я застрял и откладываю, потом попробую", scenario: "B", eventType: "answer" },
    ], "ru"),
    allowed: [
      "Если ты застрял, какой шаг можно сделать настолько маленьким, чтобы начать было почти не страшно?",
      "Что можно сделать за 5 минут, чтобы выйти из откладывания без рывка и давления?",
    ],
  },
  {
    label: "stage3-after-self-attack-ru",
    actual: getStageQuestion("3", "проект", [
      { stageId: "3", answer: "Я полный ноль и лучше молчать", scenario: "B", eventType: "answer" },
    ], "ru"),
    allowed: [
      "Что в обратной связи было фактом, а что стало болезненной оценкой себя?",
      "Какую одну полезную часть замечания можно взять без самообвинения?",
    ],
  },
  {
    label: "stage4-after-collapse-en",
    actual: getStageQuestion("4", "exam", [
      { stageId: "4", answer: "Nothing matched, it feels like total failure", scenario: "B", eventType: "answer" },
    ], "en"),
    allowed: [
      "Without cancelling the whole effort, where do you see one match with the goal and one mismatch?",
      "What one criterion can you check calmly so the comparison becomes more precise?",
    ],
  },
  {
    label: "stage5-after-rebuild-ru",
    actual: getStageQuestion("5", "проект", [
      { stageId: "5", answer: "Переделаю все с нуля или брошу", scenario: "B", eventType: "answer" },
    ], "ru"),
    allowed: [
      "Не переделывая все с нуля, какую одну точечную правку стоит попробовать?",
      "Что можно изменить мягко и конкретно, чтобы следующая попытка стала лучше?",
    ],
  },
  {
    label: "stage4-b-carryover-en",
    actual: getStageQuestion("4", "exam", [
      { stageId: "3", answer: "This is a total failure", scenario: "B", eventType: "answer" },
    ], "en"),
    allowed: [
      "Without cancelling the whole effort, where do you see one match with the goal and one mismatch?",
      "What one criterion can you check calmly so the comparison becomes more precise?",
    ],
  },
];

const results = cases.map((item) => {
  assert(item.allowed.includes(item.actual), item.label + ': unexpected question -> ' + item.actual);
  return { label: item.label, question: item.actual };
});

console.log(JSON.stringify({ ok: true, results }, null, 2));

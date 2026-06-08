/**
 * Additional tests for edge cases:
 * - clarify → back → retry sequence
 * - multiple clarify requests in a row
 * - B-scenario on multiple consecutive stages
 * - non-academic context handling
 */

import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function getNextStage(stage) {
  const order = ["1", "2", "3", "4", "5"];
  return order[(order.indexOf(stage) + 1) % order.length];
}

const sourcePath = new URL("../lib/selfreg-flow-machine.ts", import.meta.url);
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
  require(id) {
    if (id === "@/lib/selfreg-model") return { getNextStage };
    return {};
  },
};

vm.runInNewContext(compiled.outputText, sandbox, { filename: "selfreg-flow-machine.js" });
const { reduceFlowState, isRetryRecord } = testModule.exports;

function record(stageId, scenario, eventType, answer = "answer") {
  return { stageId, stageTitle: `Stage ${stageId}`, scenario, eventType, answer, feedback: "", question: "", timestamp: new Date().toISOString() };
}

console.log("=".repeat(80));
console.log("ADDITIONAL EDGE CASE TESTS");
console.log("=".repeat(80));

// Test 1: clarify → back → retry sequence
console.log("\n[Test 1] clarify → back → retry on same stage");
const clarifyBackRetry = [
  record("2", "clarify", "clarify_request", "Не понял вопрос"),
  record("2", "clarify", "back", "Вернулся к вопросу"),
  record("2", "A", "answer", "Теперь понял, сделаю структуру"),
];
const state1 = reduceFlowState(clarifyBackRetry, "1");
console.log("  Clarify count:", state1.clarifyCount);
console.log("  Back count:", state1.backCount);
console.log("  Retry detected:", isRetryRecord(clarifyBackRetry, 2));
assert(state1.clarifyCount === 1, "clarify count should be 1");
assert(state1.backCount === 1, "back count should be 1");
assert(isRetryRecord(clarifyBackRetry, 2), "third record should be retry");
console.log("  ✓ PASS");

// Test 2: Multiple clarify requests in a row
console.log("\n[Test 2] Multiple clarify requests (should not zacyclitся)");
const multipleClarify = [
  record("3", "clarify", "clarify_request", "Не совсем ясно"),
  record("3", "clarify", "clarify_request", "Поясните ещё раз"),
  record("3", "A", "answer", "Теперь понял"),
];
const state2 = reduceFlowState(multipleClarify, "1");
console.log("  Clarify count:", state2.clarifyCount);
console.log("  Current stage:", state2.currentStageId);
assert(state2.clarifyCount === 2, "should count multiple clarifies");
console.log("  ✓ PASS (clarify count tracked, but no limit implemented)");

// Test 3: B-scenario on multiple consecutive stages
console.log("\n[Test 3] B-scenario on stages 1, 2, 3 (consecutive)");
const consecutiveB = [
  record("1", "B", "answer", "Должен получить только пятёрку"),
  record("2", "B", "answer", "Сразу сделаю всё идеально"),
  record("3", "B", "answer", "Я всё испортил, я тупой"),
  record("4", "A", "answer", "Но можно исправить"),
  record("5", "A", "answer", "Скорректирую план"),
];
const state3 = reduceFlowState(consecutiveB, "1");
console.log("  Progress count:", state3.progressCount);
console.log("  Is complete:", state3.isComplete);
assert(state3.progressCount === 5, "should complete all stages");
assert(state3.isComplete === true, "session should be complete");
console.log("  ✓ PASS (B-scenarios do not block progress)");

// Test 4: Non-academic context
console.log("\n[Test 4] Non-academic context (sport, communication)");
const nonAcademic = [
  record("1", "A", "answer", "Хочу лучше общаться с друзьями"),
  record("2", "A", "answer", "Позвоню одному другу сегодня"),
  record("3", "A", "answer", "Разговор прошёл нормально"),
  record("4", "A", "answer", "Сравниваю с целью - ближе стал"),
  record("5", "A", "answer", "Продолжу в том же духе"),
];
const state4 = reduceFlowState(nonAcademic, "1");
console.log("  Progress count:", state4.progressCount);
console.log("  Is complete:", state4.isComplete);
assert(state4.isComplete === true, "non-academic context should work");
console.log("  ✓ PASS");

// Test 5: Interrupted session → restore from draft
console.log("\n[Test 5] Interrupted session (in_progress state)");
const interrupted = [
  record("1", "A", "answer", "Цель: закончить проект"),
  record("2", "A", "answer", "Шаг: сделать черновик"),
  record("3", "A", "answer", "Обратная связь: получил замечания"),
];
const state5 = reduceFlowState(interrupted, "1");
console.log("  Progress count:", state5.progressCount);
console.log("  Is complete:", state5.isComplete);
console.log("  Current stage:", state5.currentStageId);
assert(state5.isComplete === false, "session should not be complete");
assert(state5.currentStageId === "4", "should be on stage 4");
console.log("  ✓ PASS (can resume from stage 4)");

// Test 6: Skip events
console.log("\n[Test 6] Skip events (bypass clarify)");
const withSkips = [
  record("1", "A", "answer", "Цель"),
  record("2", "clarify", "skip", "Пропущено"),
  record("3", "A", "answer", "Обратная связь"),
];
const state6 = reduceFlowState(withSkips, "1");
console.log("  Skip count:", state6.skipCount);
console.log("  Progress count:", state6.progressCount);
assert(state6.skipCount === 1, "should count skip");
assert(state6.progressCount === 3, "skip still counts as progress");
console.log("  ✓ PASS");

console.log("\n" + "=".repeat(80));
console.log("SUMMARY");
console.log("=".repeat(80));
console.log("All 6 additional edge case tests PASSED");
console.log("=".repeat(80));

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

const {
  FLOW_STAGE_TRANSITIONS,
  FLOW_EVENT_TYPES,
  createInitialFlowState,
  applyFlowEvent,
  reduceFlowState,
  serializeFlowState,
  isRetryRecord,
  inferEventTypeFromRecord,
  getNextStageForEvent,
  buildFlowEventSequence,
} = testModule.exports;

function record(stageId, scenario, eventType, answer = "осмысленный ответ") {
  return {
    stageId,
    stageTitle: "stage-" + stageId,
    scenario,
    eventType,
    answer,
    feedback: "feedback",
    question: "question-" + stageId,
    timestamp: new Date().toISOString(),
  };
}

assert(FLOW_EVENT_TYPES.includes("RETRY"), "FLOW_EVENT_TYPES must include RETRY");
assert(FLOW_EVENT_TYPES.includes("COMPLETE"), "FLOW_EVENT_TYPES must include COMPLETE");

for (const [stageId, transitions] of Object.entries(FLOW_STAGE_TRANSITIONS)) {
  assert(transitions.CLARIFY_REQUEST === stageId, "clarify transition mismatch for stage " + stageId);
  assert(transitions.BACK === stageId, "back transition mismatch for stage " + stageId);
  assert(transitions.RETRY === stageId, "retry transition mismatch for stage " + stageId);
  assert(transitions.ANSWER === getNextStage(stageId), "answer transition mismatch for stage " + stageId);
  assert(transitions.SKIP === getNextStage(stageId), "skip transition mismatch for stage " + stageId);
}

const directRetry = applyFlowEvent(createInitialFlowState("3"), { type: "RETRY", stageId: "3" });
assert(directRetry.currentStageId === "3", "RETRY must keep the same stage");
assert(directRetry.retryCount === 1, "RETRY must increment retryCount");

const directComplete = applyFlowEvent(createInitialFlowState("5"), { type: "COMPLETE", stageId: "5" }, { initialStageId: "1" });
assert(directComplete.isComplete, "COMPLETE must mark the flow complete");
assert(directComplete.currentStageId === "1", "COMPLETE must reset current stage to initial stage");

const directBack = applyFlowEvent(createInitialFlowState("3"), { type: "BACK", stageId: "3" });
assert(directBack.currentStageId === "3", "BACK must keep the same stage");
assert(directBack.backCount === 1, "BACK must increment backCount");

const directAnswer = applyFlowEvent(createInitialFlowState("3"), { type: "ANSWER", stageId: "3" });
assert(directAnswer.currentStageId === "4", "ANSWER must move to next stage via transition table");
assert(directAnswer.progressCount === 1, "ANSWER must increment progressCount");

const clarifyOnly = [record("1", "clarify", "clarify_request", "Не понял вопрос")];
const clarifyState = reduceFlowState(clarifyOnly);
assert(clarifyState.currentStageId === "1", "clarify must keep the same stage");
assert(clarifyState.progressCount === 0, "clarify must not count as progress");
assert(clarifyState.clarifyCount === 1, "clarify count mismatch");
assert(!clarifyState.isComplete, "clarify-only session cannot be complete");

const retryAfterClarify = [
  record("1", "clarify", "clarify_request", "Не очень понял"),
  record("1", "A", "answer", "Хочу закончить проект и начать с плана"),
];
const retrySequence = buildFlowEventSequence(retryAfterClarify[1], { isRetry: true });
assert(retrySequence[0].type === "RETRY", "retry sequence must start with RETRY");
assert(retrySequence[1].type === "ANSWER", "retry sequence must then apply ANSWER");
const retryState = reduceFlowState(retryAfterClarify);
assert(retryState.currentStageId === "2", "answer after clarify must advance to stage 2");
assert(retryState.progressCount === 1, "answer after clarify must count as progress");
assert(retryState.retryCount === 1, "answer after clarify must be counted as retry");
assert(isRetryRecord(retryAfterClarify, 1), "retry after clarify was not detected");

const backAndRetry = [
  record("1", "A", "answer", "Хочу получить пятерку"),
  record("1", "clarify", "back", "Вернулся к предыдущему вопросу, чтобы изменить ответ."),
  record("1", "B", "answer", "Хочу сделать цель реалистичнее"),
];
const backState = reduceFlowState(backAndRetry);
assert(backState.currentStageId === "2", "answer after back must advance from revised stage");
assert(backState.backCount === 1, "back count mismatch");
assert(backState.retryCount === 1, "answer after back must be counted as retry");
assert(isRetryRecord(backAndRetry, 2), "retry after back was not detected");

const skipped = [record("1", "skipped", "skip", "Пропущено")];
const skippedState = reduceFlowState(skipped);
assert(skippedState.currentStageId === "2", "skip must advance to next stage");
assert(skippedState.skipCount === 1, "skip count mismatch");
assert(skippedState.progressCount === 1, "skip must count as progress event");
assert(getNextStageForEvent("1", "SKIP") === "2", "SKIP transition helper mismatch");

const complete = ["1", "2", "3", "4", "5"].map((stageId) => record(stageId, "A", "answer"));
const completeState = reduceFlowState(complete);
assert(completeState.isComplete, "five progress stages must complete the session");
assert(completeState.completedStageIds.size === 5, "completed stages mismatch");
assert(completeState.currentStageId === "1", "after completion current stage should reset to initial stage");
assert(completeState.lastEvent?.type === "COMPLETE", "last event must be COMPLETE after full cycle");

const legacyBack = {
  ...record("2", "clarify", undefined, "Returned to revise the previous answer."),
  eventType: undefined,
};
assert(inferEventTypeFromRecord(legacyBack) === "back", "legacy English back inference failed");

const legacyBackRu = {
  ...record("2", "clarify", undefined, "Вернулся к предыдущему вопросу, чтобы изменить ответ."),
  eventType: undefined,
};
assert(inferEventTypeFromRecord(legacyBackRu) === "back", "legacy Russian back inference failed");

console.log(JSON.stringify({
  ok: true,
  clarify: serializeFlowState(clarifyState),
  retry: serializeFlowState(retryState),
  back: serializeFlowState(backState),
  skipped: serializeFlowState(skippedState),
  complete: serializeFlowState(completeState),
}, null, 2));

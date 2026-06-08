const baseUrl = process.env.SELFREG_BASE_URL || "http://localhost:3000";

function hasSuspiciousEncoding(value) {
  return typeof value === "string" && (value.includes("????") || value.includes("\uFFFD") || /(?:Р.|С.){3,}/.test(value));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function makeSessionId() {
  return crypto.randomUUID();
}

async function readJson(response, label) {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`${label} failed: ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function fetchTeacherSession(teacherId, childId, sessionId) {
  const teacherResponse = await fetch(
    `${baseUrl}/api/teacher-data?teacherId=${encodeURIComponent(teacherId)}`,
    { cache: "no-store" }
  );
  const teacherPayload = await readJson(teacherResponse, "Teacher data");
  const child = (teacherPayload.children || []).find((item) => item.id === childId);
  const sessions = child?.sessions || [];
  const session = sessions.find((item) => item.sessionId === sessionId);
  return { child, sessions, session };
}

function assertCleanRecords(records) {
  const suspicious = records.some((record) =>
    hasSuspiciousEncoding(record.answer) ||
    hasSuspiciousEncoding(record.feedback) ||
    hasSuspiciousEncoding(record.question)
  );

  assert(!suspicious, "Suspicious encoding found in session records");
}

async function main() {
  const teacherId = `FLOW_${Date.now()}`;
  const sessionId = makeSessionId();
  const updatedAt = new Date().toISOString();

  const childResponse = await fetch(`${baseUrl}/api/children`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      name: "Проверка черновика сессии",
      teacherId,
      realData: {
        fio: "Проверка Черновик",
        klass: "10А"
      },
      consentGiven: true,
      consentTimestamp: new Date().toISOString()
    })
  });

  const childPayload = await readJson(childResponse, "Child create");
  const childId = childPayload.child.id;

  try {
    const firstRecords = [
      {
        stageId: "1",
        stageTitle: "Цель",
        scenario: "B",
        eventType: "answer",
        answer: "Надо сделать идеально и сразу, иначе это провал.",
        feedback: "В ответе много давления; стоит сузить цель и выбрать посильный первый шаг.",
        question: "Что сейчас важнее всего улучшить?",
        timestamp: "2026-06-04T17:00:00.000Z",
        provider: "mock",
        model: "local-mock",
        responseMode: "mock"
      }
    ];

    await readJson(await fetch(`${baseUrl}/api/session-sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        sessionId,
        childId,
        context: "проверка черновика",
        finalNote: "",
        updatedAt,
        lang: "ru",
        historyInsight: "",
        records: firstRecords
      })
    }), "Draft sync");

    let teacherState = await fetchTeacherSession(teacherId, childId, sessionId);
    assert(teacherState.session, "Draft session is not visible in teacher data");
    assert(teacherState.sessions.length === 1, `Expected 1 draft session, got ${teacherState.sessions.length}`);
    assert(teacherState.session.records.length === 1, `Expected 1 draft record, got ${teacherState.session.records.length}`);
    assert(teacherState.session.finalNote === "", "Draft finalNote must stay empty");
    assert(teacherState.session.records[0].scenario === "B", "Draft record must preserve B scenario");
    assertCleanRecords(teacherState.session.records);

    const updatedRecords = [
      ...firstRecords,
      {
        stageId: "2",
        stageTitle: "Переход к действию",
        scenario: "clarify",
        eventType: "clarify_request",
        answer: "Я не понял вопрос, можно проще?",
        feedback: "Подросток попросил уточнить формулировку.",
        question: "Какой первый маленький шаг можно сделать без давления?",
        timestamp: "2026-06-04T17:00:10.000Z",
        provider: "mock",
        model: "local-mock",
        responseMode: "mock"
      },
      {
        stageId: "2",
        stageTitle: "Переход к действию",
        scenario: "B",
        eventType: "answer",
        answer: "Сделаю только один раздел, а не весь проект сразу.",
        feedback: "Действие стало реалистичнее: теперь есть шаг, который можно выполнить спокойно.",
        question: "Какой первый маленький шаг можно сделать без давления?",
        timestamp: "2026-06-04T17:00:20.000Z",
        provider: "mock",
        model: "local-mock",
        responseMode: "mock"
      }
    ];

    await readJson(await fetch(`${baseUrl}/api/session-sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        sessionId,
        childId,
        context: "проверка черновика",
        finalNote: "",
        updatedAt: new Date(Date.parse(updatedAt) + 1000).toISOString(),
        lang: "ru",
        historyInsight: "",
        records: updatedRecords
      })
    }), "Draft update");

    teacherState = await fetchTeacherSession(teacherId, childId, sessionId);
    assert(teacherState.sessions.length === 1, `Draft update created duplicate sessions: ${teacherState.sessions.length}`);
    assert(teacherState.session.records.length === 3, `Expected 3 records after draft update, got ${teacherState.session.records.length}`);
    assert(teacherState.session.records[1].eventType === "clarify_request", "Clarify event was not preserved");
    assertCleanRecords(teacherState.session.records);

    const finalNote = "Сессия завершена: подросток прошел от жесткой цели к более спокойному первому шагу.";
    await readJson(await fetch(`${baseUrl}/api/session-sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        sessionId,
        childId,
        context: "проверка черновика",
        finalNote,
        updatedAt: new Date(Date.parse(updatedAt) + 2000).toISOString(),
        lang: "ru",
        historyInsight: "Проверка завершения без дублей.",
        records: updatedRecords
      })
    }), "Final sync");

    teacherState = await fetchTeacherSession(teacherId, childId, sessionId);
    assert(teacherState.sessions.length === 1, `Final sync created duplicate sessions: ${teacherState.sessions.length}`);
    assert(teacherState.session.finalNote === finalNote, "Final note was not persisted on the same session");
    assert(teacherState.session.records.length === 3, `Expected 3 final records, got ${teacherState.session.records.length}`);
    assertCleanRecords(teacherState.session.records);

    console.log(
      JSON.stringify(
        {
          ok: true,
          teacherId,
          childId,
          sessionId,
          sessionCount: teacherState.sessions.length,
          recordCount: teacherState.session.records.length,
          events: teacherState.session.records.map((record) => ({
            stageId: record.stageId,
            scenario: record.scenario,
            eventType: record.eventType,
            responseMode: record.responseMode,
            provider: record.provider,
            model: record.model,
            answer: record.answer
          })),
          finalNote: teacherState.session.finalNote
        },
        null,
        2
      )
    );
  } finally {
    await fetch(
      `${baseUrl}/api/children?childId=${encodeURIComponent(childId)}&teacherId=${encodeURIComponent(teacherId)}`,
      { method: "DELETE" }
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
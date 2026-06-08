const baseUrl = process.env.SELFREG_BASE_URL || "http://localhost:3000";
const teacherId = `UTF8_${Date.now()}`;

async function request(path, init) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();
  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response for ${path}: ${text.slice(0, 200)}`);
  }

  if (!response.ok) {
    throw new Error(`${path} failed with ${response.status}: ${text}`);
  }

  return data;
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} mismatch. Expected: ${expected}. Actual: ${actual}`);
  }
}

function hasSuspiciousEncoding(value) {
  return typeof value === "string" && (value.includes("????") || value.includes("\uFFFD") || /(?:Р.|С.){3,}/.test(value));
}

const childPayload = {
  name: "Тест Кириллица",
  className: "9А",
  teacherId,
  consentGiven: true,
  consentTimestamp: new Date().toISOString(),
  realData: {
    fio: "Тест Кириллица",
    klass: "9А",
  },
};

const create = await request("/api/children", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(childPayload),
});

const childId = create.child?.id;
if (!childId) throw new Error("Child id was not returned");

try {
  assertEqual(create.child.name, childPayload.name, "Child name");
  assertEqual(create.child.realData?.fio, childPayload.realData.fio, "Child FIO");
  assertEqual(create.child.realData?.klass, childPayload.realData.klass, "Child class");

  const timestamp = new Date().toISOString();
  const syncPayload = {
    childId,
    context: "Учебный проект по истории",
    finalNote: "Итоговая заметка для педагога на русском языке.",
    updatedAt: timestamp,
    lang: "ru",
    historyInsight: "Подросток сначала уточнял вопрос, потом вернулся и дал более точный ответ.",
    records: [
      {
        stageId: "1",
        stageTitle: "Цель",
        scenario: "clarify",
        eventType: "clarify_request",
        provider: "mock",
        model: "local-mock",
        responseMode: "mock",
        answer: "Не до конца понял, о чем спросили.",
        feedback: "Уточним вопрос и выберем одну понятную ситуацию.",
        question: "Что сейчас важнее всего сдвинуть с места?",
        timestamp,
      },
      {
        stageId: "1",
        stageTitle: "Цель",
        scenario: "A",
        eventType: "answer",
        provider: "mock",
        model: "local-mock",
        responseMode: "mock",
        answer: "Хочу спокойнее начать делать проект по истории.",
        feedback: "Теперь цель стала понятнее и конкретнее.",
        question: "Что сейчас важнее всего сдвинуть с места?",
        timestamp,
      },
    ],
  };

  await request("/api/session-sync", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(syncPayload),
  });

  const teacherData = await request(`/api/teacher-data?teacherId=${encodeURIComponent(teacherId)}`);
  const child = (teacherData.children || []).find((item) => item.id === childId);
  if (!child) throw new Error("Created child not found in teacher-data");

  const latestSession = child.sessions?.[0];
  if (!latestSession) throw new Error("Session not found after sync");

  assertEqual(child.name, childPayload.name, "Teacher child name");
  assertEqual(child.realData?.fio, childPayload.realData.fio, "Teacher child FIO");
  assertEqual(child.realData?.klass, childPayload.realData.klass, "Teacher child class");
  assertEqual(latestSession.context, syncPayload.context, "Session context");
  assertEqual(latestSession.finalNote, syncPayload.finalNote, "Session finalNote");
  assertEqual(latestSession.historyInsight, syncPayload.historyInsight, "Session historyInsight");
  assertEqual(latestSession.records?.[0]?.stageTitle, syncPayload.records[0].stageTitle, "Record[0] stageTitle");
  assertEqual(latestSession.records?.[0]?.answer, syncPayload.records[0].answer, "Record[0] answer");
  assertEqual(latestSession.records?.[1]?.feedback, syncPayload.records[1].feedback, "Record[1] feedback");

  const suspicious = JSON.stringify(child).split('"').some(hasSuspiciousEncoding);
  if (suspicious) throw new Error("Suspicious encoding found after Supabase roundtrip");

  console.log(JSON.stringify({ ok: true, childId, teacherId, recordCount: latestSession.records.length }, null, 2));
} finally {
  await fetch(`${baseUrl}/api/children?childId=${encodeURIComponent(childId)}&teacherId=${encodeURIComponent(teacherId)}`, { method: "DELETE" });
}

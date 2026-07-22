import {
  getEffectiveSessionStatus,
  getLatestCompletedSessionNextAction,
  getLatestResumableStudentSession,
  getStudentDashboardMetrics,
  getStudentDashboardStatus,
} from "@/lib/student-dashboard";
import type { ChildProfile } from "@/types/session";

function createProfile(overrides: Partial<ChildProfile> = {}): ChildProfile {
  return {
    id: "child-1",
    name: "Student",
    createdAt: "2026-06-01T08:00:00.000Z",
    sessions: [],
    ...overrides,
  };
}

describe("student dashboard helpers", () => {
  it("separates completed and in-progress sessions and keeps latest activity", () => {
    const profile = createProfile({
      sessions: [
        {
          sessionId: "older-completed",
          context: "Older completed",
          records: [{ stageId: "1", stageTitle: "Goal", scenario: "A", answer: "Done", feedback: "OK", question: "Q", timestamp: "2026-06-10T09:00:00.000Z" }],
          finalNote: "Finished",
          status: "completed",
          updatedAt: "2026-06-10T10:00:00.000Z",
        },
        {
          sessionId: "newer-progress",
          context: "Current session",
          records: [{ stageId: "1", stageTitle: "Goal", scenario: "B", answer: "Working", feedback: "Keep going", question: "Q", timestamp: "2026-06-12T09:00:00.000Z" }],
          finalNote: "",
          status: "in_progress",
          updatedAt: "2026-06-12T10:00:00.000Z",
        },
      ],
    });

    const metrics = getStudentDashboardMetrics(profile, new Date("2026-06-12T10:30:00.000Z"));

    expect(metrics.completedSessions).toHaveLength(1);
    expect(metrics.inProgressSessions).toHaveLength(1);
    expect(metrics.totalSessions).toBe(2);
    expect(metrics.latestSession?.sessionId).toBe("newer-progress");
  });

  it("returns an active status when unfinished sessions exist", () => {
    const profile = createProfile({
      sessions: [
        {
          sessionId: "draft",
          context: "Current session",
          records: [{ stageId: "1", stageTitle: "Goal", scenario: "A", answer: "Draft", feedback: "OK", question: "Q", timestamp: "2026-06-12T09:00:00.000Z" }],
          finalNote: "",
          status: "in_progress",
          updatedAt: "2026-06-12T10:00:00.000Z",
        },
      ],
    });

    const metrics = getStudentDashboardMetrics(profile, new Date("2026-06-12T10:30:00.000Z"));
    const status = getStudentDashboardStatus(profile, metrics, "ru");

    expect(status.tone).toBe("active");
    expect(status.title).toBe("Сессия в процессе");
  });

  it("returns a ready state for a linked student with no sessions", () => {
    const profile = createProfile({ teacherId: "teacher-1" });

    const metrics = getStudentDashboardMetrics(profile);
    const status = getStudentDashboardStatus(profile, metrics, "en");

    expect(status.tone).toBe("neutral");
    expect(status.title).toBe("Ready for the first session");
    expect(status.description).toContain("linked to a teacher");
  });

  it("excludes student-archived sessions from student metrics", () => {
    const profile = createProfile({
      sessions: [
        {
          sessionId: "visible",
          context: "Visible completed",
          records: [],
          finalNote: "Finished",
          status: "completed",
          updatedAt: "2026-06-10T10:00:00.000Z",
        },
        {
          sessionId: "hidden",
          context: "Hidden completed",
          records: [],
          finalNote: "Finished",
          status: "completed",
          updatedAt: "2026-06-11T10:00:00.000Z",
          studentArchivedAt: "2026-06-12T10:00:00.000Z",
        },
      ],
    });

    const metrics = getStudentDashboardMetrics(profile);

    expect(metrics.totalSessions).toBe(1);
    expect(metrics.completedSessions.map((session) => session.sessionId)).toEqual(["visible"]);
  });

  it("surfaces the latest completed adjustment without exposing another language", () => {
    const profile = createProfile({
      sessions: [
        {
          sessionId: "older-en",
          context: "Exam preparation",
          records: [
            { stageId: "5", stageTitle: "Adjustment", scenario: "A", eventType: "answer", answer: "Plan one focused review block.", feedback: "OK", question: "Q", timestamp: "2026-06-10T09:00:00.000Z" },
          ],
          finalNote: "Finished",
          status: "completed",
          lang: "en",
          updatedAt: "2026-06-10T10:00:00.000Z",
        },
        {
          sessionId: "newer-ru",
          context: "Подготовка к контрольной",
          records: [
            { stageId: "5", stageTitle: "Корректировка", scenario: "A", eventType: "answer", answer: "Повторить одну тему вечером.", feedback: "Хорошо", question: "Вопрос", timestamp: "2026-06-12T09:00:00.000Z" },
          ],
          finalNote: "Готово",
          status: "completed",
          lang: "ru",
          updatedAt: "2026-06-12T10:00:00.000Z",
        },
        {
          sessionId: "hidden-en",
          context: "Hidden",
          records: [
            { stageId: "5", stageTitle: "Adjustment", scenario: "A", eventType: "answer", answer: "Do not show this.", feedback: "OK", question: "Q", timestamp: "2026-06-13T09:00:00.000Z" },
          ],
          finalNote: "Finished",
          status: "completed",
          lang: "en",
          updatedAt: "2026-06-13T10:00:00.000Z",
          studentArchivedAt: "2026-06-13T10:01:00.000Z",
        },
      ],
    });

    expect(getLatestCompletedSessionNextAction(profile, "en")).toMatchObject({
      session: { sessionId: "older-en" },
      action: "Plan one focused review block.",
    });
    expect(getLatestCompletedSessionNextAction(profile, "ru")).toMatchObject({
      session: { sessionId: "newer-ru" },
      action: "Повторить одну тему вечером.",
    });
  });

  it("selects the newest resumable session in the dashboard language", () => {
    const profile = createProfile({
      sessions: [
        {
          sessionId: "older-en",
          context: "Essay outline",
          records: [{ stageId: "1", stageTitle: "Goal", scenario: "A", eventType: "answer", answer: "Outline", feedback: "OK", question: "Q", timestamp: "2026-07-14T09:00:00.000Z" }],
          finalNote: "",
          status: "in_progress",
          lang: "en",
          updatedAt: "2026-07-14T10:00:00.000Z",
        },
        {
          sessionId: "newer-ru",
          context: "Подготовка к выступлению",
          records: [{ stageId: "1", stageTitle: "Цель", scenario: "A", eventType: "answer", answer: "Начать", feedback: "Хорошо", question: "Вопрос", timestamp: "2026-07-15T09:00:00.000Z" }],
          finalNote: "",
          status: "in_progress",
          lang: "ru",
          updatedAt: "2026-07-15T10:00:00.000Z",
        },
        {
          context: "Legacy without an id",
          records: [{ stageId: "1", stageTitle: "Goal", scenario: "A", eventType: "answer", answer: "Start", feedback: "OK", question: "Q", timestamp: "2026-07-16T09:00:00.000Z" }],
          finalNote: "",
          status: "in_progress",
          lang: "en",
          updatedAt: "2026-07-16T10:00:00.000Z",
        },
      ],
    });

    const currentDate = new Date("2026-07-16T10:00:00.000Z");
    expect(getLatestResumableStudentSession(profile, "en", currentDate)?.sessionId).toBe("older-en");
    expect(getLatestResumableStudentSession(profile, "ru", currentDate)?.sessionId).toBe("newer-ru");
  });

  it("treats old unfinished sessions as abandoned", () => {
    expect(
      getEffectiveSessionStatus(
        {
          sessionId: "old-draft",
          context: "Old work",
          records: [{ stageId: "1", stageTitle: "Goal", scenario: "A", answer: "Draft", feedback: "OK", question: "Q", timestamp: "2026-06-01T09:00:00.000Z" }],
          finalNote: "",
          status: "in_progress",
          updatedAt: "2026-06-01T10:00:00.000Z",
        },
        new Date("2026-06-10T10:00:00.000Z")
      )
    ).toBe("abandoned");
  });
});

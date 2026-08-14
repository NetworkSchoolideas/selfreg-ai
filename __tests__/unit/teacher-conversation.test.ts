const requireTeacherAccessMock = jest.fn();
const fetchChildrenMock = jest.fn();
const generateTeacherConversationMock = jest.fn();

jest.mock("@/lib/server-teacher-access", () => ({
  requireTeacherAccess: () => requireTeacherAccessMock(),
}));
jest.mock("@/lib/server-storage", () => ({
  fetchChildrenFromSupabase: (...args: unknown[]) => fetchChildrenMock(...args),
}));
jest.mock("@/lib/teacher-conversation", () => {
  const actual = jest.requireActual("@/lib/teacher-conversation");
  return { ...actual, generateTeacherConversation: (...args: unknown[]) => generateTeacherConversationMock(...args) };
});

import { POST } from "@/app/api/teacher-conversation/route";
import { parseTeacherConversation } from "@/lib/teacher-conversation";

const childId = "11111111-1111-4111-8111-111111111111";
const updatedAt = "2026-08-14T12:00:00.000Z";

describe("teacher conversation preparation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireTeacherAccessMock.mockResolvedValue({ teacherId: "teacher-1" });
    fetchChildrenMock.mockResolvedValue([{
      id: childId,
      sessions: [{
        context: "exam preparation",
        updatedAt,
        status: "completed",
        lang: "en",
        finalNote: "A next action was chosen.",
        records: [{ stageId: "1", scenario: "A", eventType: "answer", answer: "private", feedback: "private" }],
      }],
    }]);
    generateTeacherConversationMock.mockResolvedValue({
      summary: "The completed session contains one recorded stage.",
      questions: ["Which first step felt manageable?"],
      nextStep: "Invite the student to choose one small follow-up action.",
    });
  });

  it("accepts only an authenticated teacher's completed linked session and sends factual facts, not raw answers", async () => {
    const response = await POST(new Request("https://selfreg.ai/api/teacher-conversation", {
      method: "POST",
      body: JSON.stringify({ childId, sessionUpdatedAt: updatedAt, provider: "groq", model: "openai/gpt-oss-20b", userApiKey: "test-key", lang: "en" }),
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({ ok: true }));
    expect(fetchChildrenMock).toHaveBeenCalledWith("teacher-1");
    expect(generateTeacherConversationMock).toHaveBeenCalledWith(expect.objectContaining({
      facts: expect.objectContaining({ context: "exam preparation", answers: 1, completedStages: 1 }),
    }));
    expect(generateTeacherConversationMock.mock.calls[0][0].facts).not.toHaveProperty("answer");
  });

  it("rejects a non-completed session before calling a provider", async () => {
    fetchChildrenMock.mockResolvedValue([{ id: childId, sessions: [{ context: "draft", updatedAt, status: "active", lang: "en", records: [] }] }]);
    const response = await POST(new Request("https://selfreg.ai/api/teacher-conversation", {
      method: "POST",
      body: JSON.stringify({ childId, sessionUpdatedAt: updatedAt, provider: "groq", userApiKey: "test-key", lang: "en" }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({ code: "SESSION_NOT_COMPLETED" }));
    expect(generateTeacherConversationMock).not.toHaveBeenCalled();
  });

  it("requires a complete structured provider result", () => {
    expect(parseTeacherConversation('{"summary":"Fact","questions":["What helped?"],"nextStep":"Ask one calm question."}')).toEqual({
      summary: "Fact",
      questions: ["What helped?"],
      nextStep: "Ask one calm question.",
    });
    expect(() => parseTeacherConversation("free text only")).toThrow("unusable conversation preparation");
  });
});

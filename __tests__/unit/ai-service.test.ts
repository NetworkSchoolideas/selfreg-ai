import { AIService } from "@/services/ai-service";
import type { CompletedSession } from "@/types/session";

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      "content-type": "application/json",
      ...(init.headers as Record<string, string> | undefined),
    },
  });
}

describe("AIService", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("returns a normalized stage response from the chat API", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(
      jsonResponse({
        scenario: "A",
        feedback: "Test feedback",
        dashboardNote: "Teacher note",
        responseMode: "mock",
      })
    );

    const result = await new AIService("").getResponse({
      userId: "user-1",
      answer: "answer",
      currentStage: "1",
      context: "exam",
      provider: "mock",
      lang: "en",
      history: [],
    });

    expect(result).toEqual({
      scenario: "A",
      feedback: "Test feedback",
      finalNote: "Teacher note",
      responseMode: "mock",
    });
  });

  it("returns a history insight only when there are past sessions", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(jsonResponse({ feedback: "Welcome back" }));
    const service = new AIService("");

    await expect(service.getHistoryInsight([], "mock")).resolves.toBeNull();

    const sessions: CompletedSession[] = [
      {
        context: "exam",
        records: [],
        finalNote: "Finished calmly",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    await expect(service.getHistoryInsight(sessions, "mock")).resolves.toBe("Welcome back");
  });

  it("checks provider availability through the provider-check API", async () => {
    const fetchMock = jest.spyOn(global, "fetch");
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: false }, { status: 500 }));

    const service = new AIService("");

    await expect(service.checkProvider("mock")).resolves.toBe(true);
    await expect(service.checkProvider("mock")).resolves.toBe(false);
  });
});

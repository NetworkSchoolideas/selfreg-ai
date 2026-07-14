const analyzeMock = jest.fn();
const getAiProviderMock = jest.fn(() => ({
  analyze: analyzeMock,
}));
const requireServerUserAccessMock = jest.fn();

jest.mock("@/lib/ai-provider", () => ({
  getAiProvider: (provider?: string) => getAiProviderMock(provider),
}));

jest.mock("@/lib/server-user-access", () => ({
  requireServerUserAccess: () => requireServerUserAccessMock(),
}));

import { POST } from "@/app/api/chat/route";

describe("chat route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireServerUserAccessMock.mockResolvedValue({
      context: { userId: "authenticated-user", role: "student", email: "student@example.test", fullName: null },
    });
    analyzeMock.mockResolvedValue({
      scenario: "A",
      feedback: "Structured feedback",
      finalNote: "Dashboard note",
      responseMode: "mock",
    });
  });

  it("returns structured feedback and the next stage", async () => {
    const response = await POST(
      new Request("https://selfreg.ai/api/chat", {
        method: "POST",
        body: JSON.stringify({
          userId: "student-1",
          answer: "I want to solve five math tasks today.",
          currentStage: "1",
          context: "exam preparation",
          provider: "mock",
          lang: "en",
          history: [],
        }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      scenario: "A",
      feedback: "Structured feedback",
      finalNote: "Dashboard note",
      responseMode: "mock",
      nextStage: "2",
    });
    expect(getAiProviderMock).toHaveBeenCalledWith("mock");
    expect(analyzeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "authenticated-user",
        currentStage: "1",
        forcedScenario: "A",
        nonAcademicContext: false,
      })
    );
  });

  it("returns a deterministic safety result before selecting an AI provider", async () => {
    const response = await POST(
      new Request("https://selfreg.ai/api/chat", {
        method: "POST",
        body: JSON.stringify({
          userId: "student-1",
          answer: "I do not want to live anymore.",
          currentStage: "1",
          provider: "mock",
          lang: "en",
        }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        scenario: "clarify",
        responseMode: "mock",
        safety: expect.objectContaining({ blocked: true, category: "self_harm" }),
      })
    );
    expect(getAiProviderMock).not.toHaveBeenCalled();
    expect(analyzeMock).not.toHaveBeenCalled();
  });

  it("rejects an anonymous request before selecting an AI provider", async () => {
    requireServerUserAccessMock.mockResolvedValue({
      response: new Response(JSON.stringify({ error: "Authentication required" }), { status: 401 }),
    });

    const response = await POST(
      new Request("https://selfreg.ai/api/chat", {
        method: "POST",
        body: JSON.stringify({ userId: "student-1", answer: "A safe answer", currentStage: "1" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(getAiProviderMock).not.toHaveBeenCalled();
  });
});

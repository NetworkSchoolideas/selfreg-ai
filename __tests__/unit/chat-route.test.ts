const analyzeMock = jest.fn();
const getAiProviderMock = jest.fn(() => ({
  analyze: analyzeMock,
}));

jest.mock("@/lib/ai-provider", () => ({
  getAiProvider: (provider?: string) => getAiProviderMock(provider),
}));

import { POST } from "@/app/api/chat/route";

describe("chat route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
        userId: "student-1",
        currentStage: "1",
        forcedScenario: "A",
        nonAcademicContext: false,
      })
    );
  });
});

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

import { POST } from "@/app/api/provider-check/route";

describe("provider-check route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireServerUserAccessMock.mockResolvedValue({
      context: { userId: "authenticated-user", role: "student", email: "student@example.test", fullName: null },
    });
    analyzeMock.mockResolvedValue({
      scenario: "A",
      feedback: "Provider is working",
      finalNote: "",
      responseMode: "mock",
    });
  });

  it("checks a provider and redacts the supplied key", async () => {
    const response = await POST(
      new Request("https://selfreg.ai/api/provider-check", {
        method: "POST",
        body: JSON.stringify({
          provider: "mock",
          model: "test-model",
          userApiKey: "sk-test-1234567890",
          lang: "en",
        }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      provider: "mock",
      model: "test-model",
      key: "sk-t...7890",
      sample: "Provider is working",
      responseMode: "mock",
    });
    expect(getAiProviderMock).toHaveBeenCalledWith("mock");
    expect(analyzeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "authenticated-user",
        currentStage: "1",
        provider: "mock",
        model: "test-model",
        userApiKey: "sk-test-1234567890",
        lang: "en",
      })
    );
  });

  it("rejects an anonymous provider check", async () => {
    requireServerUserAccessMock.mockResolvedValue({
      response: new Response(JSON.stringify({ error: "Authentication required" }), { status: 401 }),
    });

    const response = await POST(
      new Request("https://selfreg.ai/api/provider-check", {
        method: "POST",
        body: JSON.stringify({ provider: "mock" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(analyzeMock).not.toHaveBeenCalled();
  });

  it("does not mark a local fallback as a working live-provider connection", async () => {
    analyzeMock.mockResolvedValueOnce({
      scenario: "A",
      feedback: "Local fallback",
      finalNote: "",
      responseMode: "llm-fallback",
    });

    const response = await POST(
      new Request("https://selfreg.ai/api/provider-check", {
        method: "POST",
        body: JSON.stringify({ provider: "openrouter", userApiKey: "test-key", lang: "en" }),
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      error: "The provider returned no usable model response. Check the selected model and try again.",
      code: "PROVIDER_UNUSABLE_RESPONSE",
    }));
  });
});

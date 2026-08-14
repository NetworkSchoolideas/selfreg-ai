import { getOpenRouterCompletionContent, openrouterProvider } from "@/lib/openrouter-provider";

describe("OpenRouter completion parsing", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns a normal chat completion", () => {
    expect(getOpenRouterCompletionContent({
      choices: [{ message: { content: "A usable reply" }, finish_reason: "stop" }],
    })).toBe("A usable reply");
  });

  it("normalizes text-part content returned by a compatible upstream", () => {
    expect(getOpenRouterCompletionContent({
      choices: [{ message: { content: [{ type: "text", text: "First" }, { type: "text", text: "Second" }] } }],
    })).toBe("First\nSecond");
  });

  it("rejects an embedded provider error instead of silently returning local fallback", () => {
    expect(() => getOpenRouterCompletionContent({
      choices: [{
        message: { content: "" },
        finish_reason: "error",
        error: { metadata: { error_type: "provider_unavailable" } },
      }],
    })).toThrow("OpenRouter returned no usable completion: provider_unavailable");
  });

  it("keeps reasoning hidden and reserves output space for a final answer", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: "A concrete next step" } }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await openrouterProvider.analyze({
      userId: "student-1",
      answer: "I will start with one paragraph.",
      currentStage: "1",
      context: "school project",
      provider: "openrouter",
      model: "openrouter/free",
      userApiKey: "test-key",
      lang: "en",
      history: [],
      forcedScenario: "A",
    });

    const request = fetchMock.mock.calls[0]?.[1];
    const body = JSON.parse(String(request?.body));
    expect(body.max_tokens).toBe(700);
    expect(body.reasoning).toEqual({ effort: "low", exclude: true });
  });
});

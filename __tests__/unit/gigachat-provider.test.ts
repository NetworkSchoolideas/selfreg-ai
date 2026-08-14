import { getGigaChatCompletionContent } from "@/lib/gigachat-provider";

describe("GigaChat completion parsing", () => {
  it("returns a non-empty chat completion", () => {
    expect(getGigaChatCompletionContent({
      choices: [{ message: { content: "Рабочий ответ" } }],
    })).toBe("Рабочий ответ");
  });

  it("rejects an empty completion instead of presenting a local fallback as live", () => {
    expect(() => getGigaChatCompletionContent({ choices: [] }))
      .toThrow("GigaChat returned no usable completion");
  });
});

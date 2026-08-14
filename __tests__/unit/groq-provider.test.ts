import { getGroqCompletionContent } from "@/lib/groq-provider";

describe("Groq completion parsing", () => {
  it("returns a non-empty chat completion", () => {
    expect(getGroqCompletionContent({
      choices: [{ message: { content: "A useful response" } }],
    })).toBe("A useful response");
  });

  it("rejects an empty completion instead of presenting a local fallback as live", () => {
    expect(() => getGroqCompletionContent({ choices: [{ message: { content: "" } }] }))
      .toThrow("Groq returned no usable completion");
  });
});

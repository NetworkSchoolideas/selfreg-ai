import { getGroqCompletionContent, getGroqModelRequestOptions } from "@/lib/groq-provider";

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

  it("suppresses hidden reasoning for the supported Groq chat models", () => {
    expect(getGroqModelRequestOptions("qwen/qwen3.6-27b")).toEqual({
      reasoning_effort: "none",
      reasoning_format: "hidden",
    });
    expect(getGroqModelRequestOptions("openai/gpt-oss-20b")).toEqual({
      reasoning_effort: "low",
      reasoning_format: "hidden",
    });
    expect(getGroqModelRequestOptions("llama-3.3-70b-versatile")).toEqual({});
  });
});

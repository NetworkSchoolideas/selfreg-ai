import { redactSecret } from "@/lib/key-security";

describe("security helpers", () => {
  it("redacts short secrets completely", () => {
    expect(redactSecret("short")).toBe("********");
  });

  it("keeps only a prefix and suffix for long secrets", () => {
    expect(redactSecret("sk-1234567890abcdef")).toBe("sk-1...cdef");
  });
});

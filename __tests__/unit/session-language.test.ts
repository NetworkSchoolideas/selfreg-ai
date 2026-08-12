import { hasSessionLanguageMismatch } from "@/lib/session-language";

describe("session language boundary", () => {
  it("hides authored session content only when an explicit saved language differs", () => {
    expect(hasSessionLanguageMismatch({ lang: "ru" }, "en")).toBe(true);
    expect(hasSessionLanguageMismatch({ lang: "en" }, "ru")).toBe(true);
    expect(hasSessionLanguageMismatch({ lang: "en" }, "en")).toBe(false);
    expect(hasSessionLanguageMismatch({}, "ru")).toBe(false);
  });
});

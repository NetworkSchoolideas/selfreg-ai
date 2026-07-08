import { childMatchesQuery, getChildDisplayName, getChildTechnicalLabel } from "@/lib/child-display";
import type { ChildProfile } from "@/types/session";

function child(overrides: Partial<ChildProfile> = {}): ChildProfile {
  return {
    id: "25aa6c83-f427-421c-8bd1-b8a966ff02de",
    name: "Test Student",
    sessions: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("child display helpers", () => {
  it("uses the student name as the primary teacher-facing label", () => {
    const profile = child({ name: "Test Student" });

    expect(getChildDisplayName(profile)).toBe("Test Student");
    expect(getChildTechnicalLabel(profile)).toBe(profile.id);
  });

  it("falls back to the child id when the name is empty", () => {
    expect(getChildDisplayName(child({ name: " " }))).toBe("25aa6c83-f427-421c-8bd1-b8a966ff02de");
  });

  it("matches teacher search by name, id, and real data", () => {
    const profile = child({
      name: "Test Student",
      realData: { fio: "Ivan Ivanov", klass: "8A" },
    });

    expect(childMatchesQuery(profile, "student")).toBe(true);
    expect(childMatchesQuery(profile, "25aa6c83")).toBe(true);
    expect(childMatchesQuery(profile, "ivan")).toBe(true);
    expect(childMatchesQuery(profile, "8a")).toBe(true);
    expect(childMatchesQuery(profile, "missing")).toBe(false);
  });
});

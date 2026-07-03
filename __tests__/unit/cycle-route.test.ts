import { GET } from "@/app/api/cycle/route";

describe("cycle route", () => {
  it("returns the five localized self-regulation stages", async () => {
    const response = await GET(new Request("https://selfreg.ai/api/cycle?lang=en"));

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.stages).toHaveLength(5);
    expect(body.stages[0]).toEqual(
      expect.objectContaining({
        id: "1",
        title: "Goal",
      })
    );
    expect(body.note).toContain("five stages");
  });
});

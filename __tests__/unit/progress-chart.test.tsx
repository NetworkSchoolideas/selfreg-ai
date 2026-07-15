import { renderToStaticMarkup } from "react-dom/server";
import ProgressChart from "@/components/analytics/ProgressChart";

describe("ProgressChart", () => {
  it("renders all analytics labels in English", () => {
    const html = renderToStaticMarkup(
      <ProgressChart
        lang="en"
        title="Student Progress"
        data={[
          {
            totalSessions: 7,
            completedSessions: 3,
            averageScore: 4.2,
            lastActivity: "2026-07-15T00:00:00.000Z",
          },
        ]}
      />,
    );

    expect(html).toContain("Student 1");
    expect(html).toContain("3/7 sessions");
    expect(html).toContain("average score");
    expect(html).toContain("Latest activity");
    expect(html).not.toContain("Ученик");
    expect(html).not.toContain("сессий");
    expect(html).not.toContain("Последняя активность");
  });
});

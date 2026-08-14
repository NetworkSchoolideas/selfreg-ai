import { renderToStaticMarkup } from "react-dom/server";
import { TeacherProviderKeyPanel } from "@/app/teacher/TeacherProviderKeyPanel";

describe("TeacherProviderKeyPanel", () => {
  it("lets a teacher configure a personal supported-provider key without implying case analysis", () => {
    const html = renderToStaticMarkup(<TeacherProviderKeyPanel lang="en" />);

    expect(html).toContain("Your AI provider key");
    expect(html).toContain("GigaChat (Direct)");
    expect(html).toContain("OpenRouter");
    expect(html).toContain("Groq");
    expect(html).toContain("does not change the student session");
    expect(html).toContain("not a diagnosis or assessment");
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import { OnboardingModal } from "@/app/components/OnboardingModal";

describe("OnboardingModal", () => {
  it("renders nothing when closed", () => {
    expect(
      renderToStaticMarkup(
        <OnboardingModal isOpen={false} onClose={jest.fn()} lang="en" type="adolescent" />,
      ),
    ).toBe("");
  });

  it("renders adolescent onboarding content when open", () => {
    const html = renderToStaticMarkup(
      <OnboardingModal isOpen={true} onClose={jest.fn()} lang="en" type="adolescent" />
    );

    expect(html).toContain("Welcome to SelfReg AI");
    expect(html).toContain("Goal");
    expect(html).toContain("Before you start");
    expect(html).toContain("not therapy or emergency help");
    expect(html).toContain("teacher linked to your account");
    expect(html).toContain("Do not enter passwords");
    expect(html).toContain("fictional learning situation and a pseudonym");
    expect(html).not.toContain("Scenario A or B");
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain("Got it");
  });

  it("renders teacher onboarding content when open", () => {
    const html = renderToStaticMarkup(
      <OnboardingModal isOpen={true} onClose={jest.fn()} lang="en" type="teacher" />
    );

    expect(html).toContain("Welcome to the Teacher Dashboard");
    expect(html).toContain("Add students");
    expect(html).toContain("Export data");
  });
});

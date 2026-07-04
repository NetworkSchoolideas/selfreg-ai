import { renderToStaticMarkup } from "react-dom/server";
import { OnboardingModal } from "@/app/components/OnboardingModal";

describe("OnboardingModal", () => {
  it("renders nothing when closed", () => {
    expect(OnboardingModal({ isOpen: false, onClose: jest.fn(), lang: "en", type: "adolescent" })).toBeNull();
  });

  it("renders adolescent onboarding content when open", () => {
    const html = renderToStaticMarkup(
      <OnboardingModal isOpen={true} onClose={jest.fn()} lang="en" type="adolescent" />
    );

    expect(html).toContain("Welcome to SelfReg AI");
    expect(html).toContain("Goal");
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

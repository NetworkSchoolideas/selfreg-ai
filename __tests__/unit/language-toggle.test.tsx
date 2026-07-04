import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const mockUsePathname = jest.fn();
const mockUseSearchParams = jest.fn();

jest.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
  useSearchParams: () => mockUseSearchParams(),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

import { LanguageToggle } from "@/app/components/LanguageToggle";

describe("LanguageToggle", () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue("/teacher");
    mockUseSearchParams.mockReturnValue(new URLSearchParams("lang=ru&teacher=abc"));
  });

  it("preserves existing params while switching language", () => {
    const html = renderToStaticMarkup(<LanguageToggle />);

    expect(html).toContain('href="/teacher?lang=ru&amp;teacher=abc"');
    expect(html).toContain('href="/teacher?lang=en&amp;teacher=abc"');
    expect(html).toContain(">RU</a>");
    expect(html).toContain(">EN</a>");
  });
});

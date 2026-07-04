import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";

function findButton(element: React.ReactNode): React.ReactElement | undefined {
  if (!React.isValidElement(element)) return undefined;
  if (element.type === "button") return element;
  const props = element.props as { children?: React.ReactNode };
  return React.Children.toArray(props.children).map(findButton).find(Boolean);
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    Object.defineProperty(global, "window", {
      value: {
        location: {
          reload: jest.fn(),
        },
      },
      configurable: true,
    });
  });

  it("renders children when no error is present", () => {
    const html = renderToStaticMarkup(
      <ErrorBoundary lang="en">
        <span>Healthy content</span>
      </ErrorBoundary>
    );

    expect(html).toContain("Healthy content");
  });

  it("renders fallback UI and reload action after an error", () => {
    const boundary = new ErrorBoundary({ children: <span>Broken</span>, lang: "en" });
    const error = new Error("Boom");
    (boundary as unknown as { state: unknown }).state = ErrorBoundary.getDerivedStateFromError(error);

    const rendered = boundary.render() as React.ReactElement;
    const html = renderToStaticMarkup(rendered);

    expect(html).toContain("Something went wrong");
    expect(html).toContain("Reload page");

    findButton(rendered)?.props.onClick();
    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });
});

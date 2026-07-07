import { copyTextToClipboard } from "@/lib/clipboard";

describe("copyTextToClipboard", () => {
  const originalNavigator = globalThis.navigator;
  const originalDocument = globalThis.document;

  afterEach(() => {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: originalNavigator,
    });
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: originalDocument,
    });
    jest.restoreAllMocks();
  });

  it("falls back when clipboard permissions reject writeText", async () => {
    const textarea = {
      value: "",
      style: {},
      setAttribute: jest.fn(),
      focus: jest.fn(),
      select: jest.fn(),
    };
    const appendChild = jest.fn();
    const removeChild = jest.fn();
    const execCommand = jest.fn(() => true);

    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        clipboard: {
          writeText: jest.fn().mockRejectedValue(new Error("permission denied")),
        },
      },
    });
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        createElement: jest.fn(() => textarea),
        body: {
          appendChild,
          removeChild,
        },
        execCommand,
      },
    });

    await expect(copyTextToClipboard("teacher-code")).resolves.toBeUndefined();
    expect(textarea.value).toBe("teacher-code");
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(appendChild).toHaveBeenCalledWith(textarea);
    expect(removeChild).toHaveBeenCalledWith(textarea);
  });
});

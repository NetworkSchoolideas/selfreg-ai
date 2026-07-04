import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ApiKeyManager } from "@/app/components/ApiKeyManager";

function createStorageMock(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: jest.fn((key: string) => store.get(key) ?? null),
    setItem: jest.fn((key: string, value: string) => store.set(key, value)),
    removeItem: jest.fn((key: string) => store.delete(key)),
  };
}

function installStorage(local: Record<string, string> = {}, session: Record<string, string> = {}) {
  const localStorageMock = createStorageMock(local);
  const sessionStorageMock = createStorageMock(session);

  Object.defineProperty(global, "localStorage", {
    value: localStorageMock,
    configurable: true,
  });
  Object.defineProperty(global, "sessionStorage", {
    value: sessionStorageMock,
    configurable: true,
  });
  Object.defineProperty(global, "window", {
    value: {
      localStorage: localStorageMock,
      sessionStorage: sessionStorageMock,
    },
    configurable: true,
  });
}

describe("ApiKeyManager", () => {
  it("shows not-set status when no key is stored", () => {
    installStorage();

    const html = renderToStaticMarkup(
      <ApiKeyManager lang="en" provider="openrouter" onKeyChange={jest.fn()} />
    );

    expect(html).toContain("not set");
  });

  it("shows saved status when a provider key exists", () => {
    installStorage({ api_key_openrouter: "sk-test-key" });

    const html = renderToStaticMarkup(
      <ApiKeyManager lang="en" provider="openrouter" onKeyChange={jest.fn()} />
    );

    expect(html).toContain("Saved");
  });

  it("shows invalid status for malformed saved GigaChat keys", () => {
    installStorage({ api_key_gigachat: "not-base64" });

    const html = renderToStaticMarkup(
      <ApiKeyManager lang="en" provider="gigachat" onKeyChange={jest.fn()} />
    );

    expect(html).toContain("invalid");
  });
});

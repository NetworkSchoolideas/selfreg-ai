import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const e2eSecret = process.env.SELFREG_E2E_SECRET || "local-e2e-secret";

const settingsUser = {
  email: "selfreg.playwright.settings@selfreg.test",
  password: "Test123!Settings",
  role: "teacher" as const,
  fullName: "Playwright Settings",
  school: "E2E School",
};

function collectClientErrors(page: Page) {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  return { pageErrors, consoleErrors };
}

function expectHealthyClient(
  tracker: { pageErrors: string[]; consoleErrors: string[] },
  ignoredConsoleErrors: string[] = [],
) {
  const consoleErrors = tracker.consoleErrors.filter((message) =>
    !ignoredConsoleErrors.some((ignored) => message.includes(ignored)),
  );
  expect(tracker.pageErrors, `Unexpected page errors: ${tracker.pageErrors.join(" | ")}`).toEqual([]);
  expect(consoleErrors, `Unexpected console errors: ${consoleErrors.join(" | ")}`).toEqual([]);
}

async function ensureConfirmedUser(request: APIRequestContext) {
  const response = await request.post("/api/e2e/setup", {
    headers: {
      "x-e2e-secret": e2eSecret,
    },
    data: {
      users: [settingsUser],
    },
  });

  expect(response.ok()).toBe(true);
}

async function loginAsSettingsUser(page: Page) {
  await page.goto("/auth/login?role=teacher&lang=en", { waitUntil: "networkidle" });
  await page.getByPlaceholder("you@example.com").fill(settingsUser.email);
  await page.getByPlaceholder("Enter your password").fill(settingsUser.password);
  await page.locator('button[type="submit"]').click({ noWaitAfter: true });
  await expect(page).toHaveURL(/\/teacher\?lang=en$/, { timeout: 15000 });
}

test.describe("Settings flow", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async ({ request }) => {
    await ensureConfirmedUser(request);
  });

  test("checks the mock provider through the server route", async ({ page }) => {
    const tracker = collectClientErrors(page);

    await loginAsSettingsUser(page);
    await page.goto("/settings?lang=en", { waitUntil: "networkidle" });

    await expect(page.getByRole("heading", { name: "Connect your own AI API" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Check the key" })).toBeVisible();
    await expect(page.getByText("Provider check has not started yet.")).toBeVisible();
    await Promise.all([
      page.waitForResponse((response) => response.url().includes("/api/provider-check") && response.request().method() === "POST"),
      page.getByRole("button", { name: "Check" }).click(),
    ]);
    await expect(page.getByText(/Connection works\. Mode: mock reply/)).toBeVisible({ timeout: 15000 });

    expectHealthyClient(tracker);
  });

  test("does not present a failed live-provider check as a working connection", async ({ page }) => {
    const tracker = collectClientErrors(page);

    await loginAsSettingsUser(page);
    await page.goto("/settings?lang=en", { waitUntil: "networkidle" });
    await page.route("**/api/provider-check", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "GitHub Models: unauthorized" }),
      });
    });

    await page.getByLabel("Provider").selectOption("github-models");
    await page.getByLabel("API key").fill("test-invalid-key");
    await page.getByRole("button", { name: "Check" }).click();

    await expect(page.getByText("Error: GitHub Models: unauthorized")).toBeVisible();
    await expect(page.getByText(/Connection works\./)).toHaveCount(0);

    expectHealthyClient(tracker, ["server responded with a status of 401"]);
  });

  test("keeps live-provider configuration after an unavailable-provider error", async ({ page }) => {
    const tracker = collectClientErrors(page);
    const testKey = "test-temporary-key";

    await loginAsSettingsUser(page);
    await page.goto("/settings?lang=en", { waitUntil: "networkidle" });
    await page.route("**/api/provider-check", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "GitHub Models: temporarily unavailable" }),
      });
    });

    await page.getByLabel("Provider").selectOption("github-models");
    await page.getByLabel("API key").fill(testKey);
    await page.getByRole("button", { name: "Check" }).click();

    await expect(page.getByText("Error: GitHub Models: temporarily unavailable")).toBeVisible();
    await expect(page.getByLabel("Provider")).toHaveValue("github-models");
    await expect(page.getByLabel("API key")).toHaveValue(testKey);
    await expect(page.getByText(/Connection works\./)).toHaveCount(0);

    expectHealthyClient(tracker, ["server responded with a status of 503"]);
  });

  test("switches settings language through URL-preserving links", async ({ page }) => {
    const tracker = collectClientErrors(page);

    await loginAsSettingsUser(page);
    await page.goto("/settings?lang=en", { waitUntil: "networkidle" });
    await page.getByRole("link", { name: "RU" }).click();

    await expect(page).toHaveURL(/\/settings\?lang=ru$/);
    await expect(page.getByRole("link", { name: "EN" })).toHaveAttribute("href", "/settings?lang=en");

    expectHealthyClient(tracker);
  });
});

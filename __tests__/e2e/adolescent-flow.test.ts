import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

function collectClientErrors(page: Page) {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  return { pageErrors, consoleErrors };
}

function expectHealthyClient(tracker: { pageErrors: string[]; consoleErrors: string[] }) {
  expect(tracker.pageErrors, `Unexpected page errors: ${tracker.pageErrors.join(" | ")}`).toEqual([]);
  expect(tracker.consoleErrors, `Unexpected console errors: ${tracker.consoleErrors.join(" | ")}`).toEqual([]);
}

async function cleanupTeacherChildren(request: APIRequestContext, teacherId: string) {
  const response = await request.get(`/api/teacher-data?teacherId=${encodeURIComponent(teacherId)}`);
  if (!response.ok()) return;

  const payload = await response.json();
  const children = Array.isArray(payload.children) ? payload.children : [];
  await Promise.all(
    children.map((child: { id?: string }) =>
      child.id
        ? request.delete(`/api/children?childId=${encodeURIComponent(child.id)}&teacherId=${encodeURIComponent(teacherId)}`)
        : Promise.resolve(),
    ),
  );
}

async function openRegisteredAdolescentSession(page: Page, teacherId: string) {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem("selfreg_onboarding_seen_adolescent", "1");
  });

  await page.goto(`/adolescent?lang=en&teacherId=${encodeURIComponent(teacherId)}`, { waitUntil: "networkidle" });
  const providerSelect = page.locator(".provider-box select");
  await expect(providerSelect).toBeVisible();
  await providerSelect.selectOption("mock");
  await expect(providerSelect).toHaveValue("mock");
  await expect(page.getByText("Mock mode: no external key needed")).toBeVisible();
  await page.getByPlaceholder("Ivanov Ivan").fill(`Playwright Student ${Date.now()}`);
  await page.getByPlaceholder("9A").fill("9A");
  await page.getByLabel(/I consent/).check();

  await Promise.all([
    page.waitForResponse(
      (response) => response.url().includes("/api/children") && response.request().method() === "POST",
      { timeout: 15_000 },
    ),
    page.getByRole("button", { name: "Start" }).click(),
  ]);

  await expect(page.getByPlaceholder("e.g.: exam, project")).toBeVisible();
  await page.getByPlaceholder("e.g.: exam, project").fill("math exam preparation");
}

test.describe("Adolescent prototype flows", () => {
  test.setTimeout(90_000);

  test("completes the full five-stage mock cycle", async ({ page, request }) => {
    const tracker = collectClientErrors(page);
    const teacherId = `E2E_ADOLESCENT_${Date.now()}`;

    try {
      await openRegisteredAdolescentSession(page, teacherId);

      for (let step = 1; step <= 5; step += 1) {
        await expect(page.locator(".stage-pill")).toContainText(`Step ${step} of 5`);
        await page.getByPlaceholder("Write 1-3 sentences").fill(
          `For step ${step}, I will make one concrete calm action and review the result after finishing it.`,
        );
        await Promise.all([
          page.waitForResponse((response) => response.url().includes("/api/session-sync") && response.request().method() === "POST"),
          page.getByRole("button", { name: "Continue" }).click(),
        ]);
      }

      await expect(page.getByText("Session completed")).toBeVisible({ timeout: 15000 });
      await expect(page.getByRole("heading", { name: "Summary" })).toBeVisible();
      await expect(page.locator(".record")).toHaveCount(5);

      expectHealthyClient(tracker);
    } finally {
      await cleanupTeacherChildren(request, teacherId);
    }
  });

  test("supports clarification and retry before advancing", async ({ page, request }) => {
    const tracker = collectClientErrors(page);
    const teacherId = `E2E_CLARIFY_${Date.now()}`;

    try {
      await openRegisteredAdolescentSession(page, teacherId);

      await page.getByRole("button", { name: /Need clarification/ }).click();
      await expect(page.locator(".clarification-box")).toContainText(/Suggestion to answer better|AI recommendation/);
      await page.getByRole("button", { name: "Clear and retry" }).click();
      await page.getByPlaceholder("Write 1-3 sentences").fill(
        "I want to prepare for the math exam by solving five practice tasks calmly today.",
      );
      await Promise.all([
        page.waitForResponse((response) => response.url().includes("/api/session-sync") && response.request().method() === "POST"),
        page.getByRole("button", { name: "Continue" }).click(),
      ]);

      await expect(page.locator(".stage-pill")).toContainText("Step 2 of 5", { timeout: 15000 });
      expectHealthyClient(tracker);
    } finally {
      await cleanupTeacherChildren(request, teacherId);
    }
  });
});

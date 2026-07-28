import { expect, test, type Page } from "@playwright/test";

function collectClientErrors(page: Page) {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  return { pageErrors, consoleErrors };
}

function expectHealthyClient(tracker: { pageErrors: string[]; consoleErrors: string[] }) {
  expect(tracker.pageErrors, `Unexpected page errors: ${tracker.pageErrors.join(" | ")}`).toEqual([]);
  expect(tracker.consoleErrors, `Unexpected console errors: ${tracker.consoleErrors.join(" | ")}`).toEqual([]);
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe("Responsive layout smoke", () => {
  test("home page renders without horizontal overflow on mobile", async ({ page }) => {
    const tracker = collectClientErrors(page);

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/?lang=en");

    await expect(page.getByRole("heading", { name: "Support for self-regulation during adolescence and early adulthood" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    expectHealthyClient(tracker);
  });

  test("English route synchronizes the document language after hydration", async ({ page }) => {
    const tracker = collectClientErrors(page);

    await page.goto("/?lang=en");

    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    expectHealthyClient(tracker);
  });

  test("teacher dashboard renders without horizontal overflow on tablet", async ({ page }) => {
    const tracker = collectClientErrors(page);

    await page.addInitScript(() => {
      window.localStorage.clear();
      window.localStorage.setItem("selfreg_onboarding_seen_teacher", "1");
    });
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/teacher?lang=en");

    await expect(page.locator("h1")).toContainText("Prepare a conversation with a student");
    await expectNoHorizontalOverflow(page);
    expectHealthyClient(tracker);
  });
});

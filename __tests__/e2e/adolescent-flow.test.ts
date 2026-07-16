import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

const e2eSecret = process.env.SELFREG_E2E_SECRET || "local-e2e-secret";

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

async function createAndLoginStudent(page: Page, request: APIRequestContext) {
  const timestamp = Date.now();
  const email = `selfreg.playwright.adolescent.${timestamp}@selfreg.test`;
  const password = "Test123!Student";
  const setupResponse = await request.post("/api/e2e/setup", {
    headers: { "x-e2e-secret": e2eSecret },
    data: {
      users: [{ email, password, role: "student", fullName: `Playwright Student ${timestamp}` }],
    },
  });
  expect(setupResponse.ok()).toBe(true);
  const setupPayload = await setupResponse.json();
  const childId = setupPayload.users?.[0]?.childId as string | undefined;
  expect(childId).toBeTruthy();

  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem("selfreg_onboarding_seen_adolescent", "1");
  });

  await page.goto("/auth/login?role=student&lang=en", { waitUntil: "networkidle" });
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.locator(".password-input-row input").fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/student\/dashboard\?lang=en$/, { timeout: 15_000 });

  return childId!;
}

async function createAndLoginTeacher(page: Page, request: APIRequestContext) {
  const timestamp = Date.now();
  const email = `selfreg.playwright.personal.${timestamp}@selfreg.test`;
  const password = `SelfRegE2E!Teacher${timestamp}`;
  const setupResponse = await request.post("/api/e2e/setup", {
    headers: { "x-e2e-secret": e2eSecret },
    data: {
      users: [{ email, password, role: "teacher", fullName: `Playwright Teacher ${timestamp}` }],
    },
  });
  expect(setupResponse.ok()).toBe(true);

  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem("selfreg_onboarding_seen_adolescent", "1");
  });

  await page.goto("/auth/login?role=teacher&lang=en", { waitUntil: "networkidle" });
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.locator(".password-input-row input").fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/teacher\?lang=en$/, { timeout: 15_000 });
}

async function openRegisteredAdolescentSession(page: Page, request: APIRequestContext) {
  const childId = await createAndLoginStudent(page, request);

  await page.goto(`/adolescent?lang=en&childId=${encodeURIComponent(childId)}&mode=new`, { waitUntil: "networkidle" });
  const consentButton = page.getByRole("button", { name: "I agree and continue" });
  if (await consentButton.isVisible().catch(() => false)) {
    await consentButton.click();
  }
  const providerSelect = page.locator(".provider-box select");
  await expect(providerSelect).toBeVisible();
  await expect(page.getByRole("link", { name: "Dashboard", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Teacher dashboard", exact: true })).toHaveCount(0);
  await expect(page.getByText("github-models: ready", { exact: true })).toHaveCount(0);
  await expect(providerSelect).toHaveValue("mock");
  await expect(page.getByText("Mock mode: no external key needed")).toBeVisible();
  await expect(page.getByPlaceholder("e.g.: exam, project")).toBeVisible();
  await expect(page.getByText("“Study project” is a starting example, not saved personal context. Replace it with your own situation.")).toBeVisible();
  await page.getByPlaceholder("e.g.: exam, project").fill("math exam preparation");

  return childId;
}

test.describe("Adolescent prototype flows", () => {
  test.setTimeout(90_000);

  test("shows the pre-start safety disclosure and closes it from the keyboard", async ({ page }) => {
    const tracker = collectClientErrors(page);
    await page.addInitScript(() => window.localStorage.clear());
    await page.goto("/adolescent?lang=en", { waitUntil: "networkidle" });

    const dialog = page.getByRole("dialog", { name: "Welcome to SelfReg AI" });
    await expect(dialog).toContainText("not therapy or emergency help");
    await expect(dialog).toContainText("teacher linked to your account");
    await expect(dialog).toContainText("Do not enter passwords");
    await page.getByRole("button", { name: "Got it, let's start!" }).press("Enter");
    await expect(dialog).toBeHidden();

    expectHealthyClient(tracker);
  });

  test("completes the full five-stage mock cycle", async ({ page, request }) => {
    const tracker = collectClientErrors(page);
    await openRegisteredAdolescentSession(page, request);

    for (let step = 1; step <= 5; step += 1) {
      await expect(page.locator(".stage-pill")).toContainText(`Step ${step} of 5`);
      await page.getByPlaceholder("Write 1-3 sentences").fill(
        `For step ${step}, I will make one concrete calm action and review the result after finishing it.`,
      );
      await page.getByRole("button", { name: "Continue" }).click();

      if (step < 5) {
        await expect(page.locator(".stage-pill")).toContainText(`Step ${step + 1} of 5`);
      }
    }

    await expect(page.getByText("Session completed")).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("heading", { name: "Summary" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open dashboard" })).toBeVisible();
    await expect(page.getByText("Results are saved in your personal dashboard.")).toBeVisible();
    await expect(page.locator(".record")).toHaveCount(5);

    await page.getByRole("button", { name: "5 stars" }).click();
    await page.getByPlaceholder("What was helpful? What could be better?").fill("The five-stage route was clear.");
    await page.getByRole("button", { name: "Send feedback to teacher" }).click();
    await expect(page.getByText("Feedback saved.")).toBeVisible();

    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.getByRole("link", { name: "Open dashboard" })).toBeVisible();
    await page.getByRole("link", { name: "Open dashboard" }).click();
    await expect(page).toHaveURL(/\/student\/dashboard\?lang=en$/);
    await expect(page.getByText("math exam preparation").first()).toBeVisible();
    await expect(page.getByText("5 steps").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();

    expectHealthyClient(tracker);
  });

  test("preserves the active attempt when switching languages", async ({ page, request }) => {
    const tracker = collectClientErrors(page);
    await openRegisteredAdolescentSession(page, request);

    await page.getByPlaceholder("Write 1-3 sentences").fill(
      "I will define one clear goal and check the result calmly.",
    );
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.locator(".stage-pill")).toContainText("Step 2 of 5", { timeout: 15_000 });

    const draft = "I will keep this unfinished answer while changing the interface language.";
    await page.getByPlaceholder("Write 1-3 sentences").fill(draft);
    await page.getByRole("link", { name: "RU" }).click();

    await expect(page).toHaveURL(/lang=ru/);
    await expect(page.locator(".stage-pill")).toContainText("Шаг 2 из 5");
    await expect(page.getByPlaceholder("Напиши 1-3 предложения")).toHaveValue(draft);
    await expect(page.getByPlaceholder("например: экзамен, проект")).toHaveValue("math exam preparation");
    await expect(page.locator(".provider-box select")).toHaveValue("mock");

    expectHealthyClient(tracker);
  });

  test("resumes the newest unfinished session from the dashboard", async ({ page, request }) => {
    const tracker = collectClientErrors(page);
    const childId = await openRegisteredAdolescentSession(page, request);
    const resumeSessionId = randomUUID();
    const updatedAt = new Date().toISOString();

    const sessionResponse = await page.request.post("/api/session-sync", {
      data: {
        childId,
        sessionId: resumeSessionId,
        status: "in_progress",
        context: "math exam preparation",
        finalNote: "",
        updatedAt,
        lang: "en",
        records: [{
          stageId: "1",
          stageTitle: "Goal",
          scenario: "A",
          eventType: "answer",
          answer: "I will prepare one clear first step for the math exam today.",
          feedback: "Choose one realistic first step.",
          question: "What do you want to improve?",
          timestamp: updatedAt,
        }],
      },
    });
    expect(sessionResponse.ok(), await sessionResponse.text()).toBe(true);

    await page.goto("/student/dashboard?lang=en", { waitUntil: "networkidle" });
    const resumeCard = page.getByText("Continue your latest session", { exact: true }).locator("..");
    await expect(resumeCard).toContainText("math exam preparation");
    await resumeCard.getByRole("link", { name: "Continue" }).click();

    await expect(page).toHaveURL(/resumeSessionId=/);
    await expect(page.locator(".stage-pill")).toContainText("Step 2 of 5", { timeout: 15_000 });
    await expect(page.getByPlaceholder("Write 1-3 sentences")).toHaveValue("");

    expectHealthyClient(tracker);
  });

  test("lets a teacher run a private self-regulation session without accessing student data", async ({ page, request }) => {
    const tracker = collectClientErrors(page);
    await createAndLoginTeacher(page, request);

    await page.goto("/adolescent?lang=en&mode=new", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Practice self-regulation for yourself" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Teacher dashboard", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Dashboard", exact: true })).toHaveCount(0);
    await expect(page.getByText("This draft is isolated to your signed-in account in this browser.")).toBeVisible();
    await expect(page.getByText("student dashboards or teacher analytics")).toBeVisible();

    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.locator("main")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    const providerSelect = page.locator(".provider-box select");
    await providerSelect.selectOption("mock");
    await page.getByPlaceholder("e.g.: exam, project").fill("staff meeting preparation");
    await page.getByPlaceholder("Write 1-3 sentences").fill(
      "I will prepare one clear agenda item and ask for feedback after the meeting.",
    );
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.locator(".stage-pill")).toContainText("Step 2 of 5", { timeout: 15_000 });
    await expect(page.getByRole("link", { name: "Open dashboard" })).toHaveCount(0);

    await page.getByRole("button", { name: "Logout" }).click();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sign in to start a personal session" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Practice self-regulation for yourself" })).toHaveCount(0);
    expectHealthyClient(tracker);
  });

  test("supports clarification and retry before advancing", async ({ page, request }) => {
    const tracker = collectClientErrors(page);
    await openRegisteredAdolescentSession(page, request);

    const answer = "I want to prepare for the math exam by solving five practice tasks calmly today.";
    const answerField = page.getByPlaceholder("Write 1-3 sentences");
    await answerField.fill(answer);
    await page.getByRole("button", { name: /Need clarification/ }).click();
    await expect(page.locator(".clarification-box")).toContainText(/Suggestion to answer better|AI recommendation/);
    await expect(answerField).toHaveValue(answer);
    await page.getByRole("button", { name: "Clear and retry" }).click();
    await expect(answerField).toHaveValue("");
    await answerField.fill(answer);
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.locator(".stage-pill")).toContainText("Step 2 of 5", { timeout: 15000 });
    expectHealthyClient(tracker);
  });

  test("stops the exercise for a safety-risk answer without saving progress", async ({ page, request }) => {
    const tracker = collectClientErrors(page);
    await openRegisteredAdolescentSession(page, request);

    await page.getByPlaceholder("Write 1-3 sentences").fill("I do not want to live anymore.");
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByRole("alert").filter({ hasText: "contact a trusted adult" })).toContainText("contact a trusted adult", { timeout: 15000 });
    await expect(page.locator(".stage-pill")).toContainText("Step 1 of 5");
    await expect(page.locator(".record")).toHaveCount(0);
    expectHealthyClient(tracker);
  });
});

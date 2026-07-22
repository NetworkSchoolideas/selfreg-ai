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
  const email = `selfreg.playwright.adolescent.${timestamp}.${randomUUID()}@selfreg.test`;
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
  const email = `selfreg.playwright.personal.${timestamp}.${randomUUID()}@selfreg.test`;
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

    await expect(page.getByRole("button", { name: "5 stars" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Send feedback to teacher" })).toHaveCount(0);

    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.getByRole("link", { name: "Open dashboard" })).toBeVisible();
    await page.getByRole("link", { name: "Open dashboard" }).click();
    await expect(page).toHaveURL(/\/student\/dashboard\?lang=en$/);
    await expect(page.getByText("math exam preparation").first()).toBeVisible();
    await expect(page.getByText("5 steps").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();

    expectHealthyClient(tracker);
  });

  test("keeps the learner on the current step when saving fails", async ({ page, request }) => {
    const tracker = collectClientErrors(page);
    await openRegisteredAdolescentSession(page, request);
    await page.route("**/api/session-sync", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "The server could not save changes" }),
      });
    });

    await page.getByPlaceholder("Write 1-3 sentences").fill(
      "I will open the assignment and write a short outline before checking my work.",
    );
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.locator(".stage-pill")).toContainText("Step 1 of 5");
    await expect(page.getByPlaceholder("Write 1-3 sentences")).toHaveValue(
      "I will open the assignment and write a short outline before checking my work.",
    );
    await expect(page.getByText("The server could not save changes").first()).toBeVisible();

    expect(tracker.pageErrors, `Unexpected page errors: ${tracker.pageErrors.join(" | ")}`).toEqual([]);
  });

  test("allows the learner to retry a failed save without losing the answer", async ({ page, request }) => {
    const tracker = collectClientErrors(page);
    await openRegisteredAdolescentSession(page, request);
    let saveAttempts = 0;
    await page.route("**/api/session-sync", async (route) => {
      saveAttempts += 1;
      if (saveAttempts === 1) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "The server could not save changes" }),
        });
        return;
      }

      await route.continue();
    });

    const answer = "I will start with the outline, then check one requirement before moving on.";
    await page.getByPlaceholder("Write 1-3 sentences").fill(answer);
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.locator(".stage-pill")).toContainText("Step 1 of 5");
    await expect(page.getByPlaceholder("Write 1-3 sentences")).toHaveValue(answer);

    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.locator(".stage-pill")).toContainText("Step 2 of 5");
    await expect(page.locator(".record")).toHaveCount(1);
    expect(saveAttempts).toBe(2);

    expect(tracker.pageErrors, `Unexpected page errors: ${tracker.pageErrors.join(" | ")}`).toEqual([]);
  });

  test("locks session controls while a clarification save is pending", async ({ page, request }) => {
    const tracker = collectClientErrors(page);
    await openRegisteredAdolescentSession(page, request);
    let releaseSave: (() => void) | undefined;
    const savePending = new Promise<void>((resolve) => {
      releaseSave = resolve;
    });
    await page.route("**/api/session-sync", async (route) => {
      await savePending;
      await route.continue();
    });

    await page.getByRole("button", { name: "Need clarification" }).click();

    await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Back" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Start over" })).toBeDisabled();
    releaseSave?.();

    await expect(page.getByRole("button", { name: "Skip this step" })).toBeVisible();
    expect(tracker.pageErrors, `Unexpected page errors: ${tracker.pageErrors.join(" | ")}`).toEqual([]);
  });

  test("does not add a clarification request when its save fails", async ({ page, request }) => {
    const tracker = collectClientErrors(page);
    await openRegisteredAdolescentSession(page, request);
    await page.route("**/api/session-sync", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "The server could not save changes" }),
      });
    });

    await page.getByRole("button", { name: "Need clarification" }).click();

    await expect(page.locator(".stage-pill")).toContainText("Step 1 of 5");
    await expect(page.locator(".record")).toHaveCount(0);
    await expect(page.getByText("The server could not save changes").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Need clarification" })).toBeEnabled();

    expect(tracker.pageErrors, `Unexpected page errors: ${tracker.pageErrors.join(" | ")}`).toEqual([]);
  });

  test("restores the clarification state when skipping cannot be saved", async ({ page, request }) => {
    const tracker = collectClientErrors(page);
    await openRegisteredAdolescentSession(page, request);
    await page.getByRole("button", { name: "Need clarification" }).click();
    await expect(page.getByRole("button", { name: "Skip this step" })).toBeVisible();

    await page.route("**/api/session-sync", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "The server could not save changes" }),
      });
    });
    await page.getByRole("button", { name: "Skip this step" }).click();

    await expect(page.locator(".stage-pill")).toContainText("Step 1 of 5");
    await expect(page.locator(".record")).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Skip this step" })).toBeVisible();
    await expect(page.getByText("The server could not save changes").first()).toBeVisible();

    expect(tracker.pageErrors, `Unexpected page errors: ${tracker.pageErrors.join(" | ")}`).toEqual([]);
  });

  test("restores the current step when going back cannot be saved", async ({ page, request }) => {
    const tracker = collectClientErrors(page);
    await openRegisteredAdolescentSession(page, request);
    await page.getByPlaceholder("Write 1-3 sentences").fill(
      "I will outline the assignment and complete the first small section now.",
    );
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.locator(".stage-pill")).toContainText("Step 2 of 5");

    await page.route("**/api/session-sync", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "The server could not save changes" }),
      });
    });
    await page.getByRole("button", { name: "Back" }).click();

    await expect(page.locator(".stage-pill")).toContainText("Step 2 of 5");
    await expect(page.locator(".record")).toHaveCount(1);
    await expect(page.getByText("The server could not save changes").first()).toBeVisible();

    expect(tracker.pageErrors, `Unexpected page errors: ${tracker.pageErrors.join(" | ")}`).toEqual([]);
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

  test("restores the revised step after refreshing a saved Back action", async ({ page, request }) => {
    const tracker = collectClientErrors(page);
    await openRegisteredAdolescentSession(page, request);
    const firstAnswer = "I will list the assignment requirements before I choose the first task.";

    await page.getByPlaceholder("Write 1-3 sentences").fill(firstAnswer);
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.locator(".stage-pill")).toContainText("Step 2 of 5", { timeout: 15_000 });

    const savedBack = page.waitForResponse((response) => (
      response.url().includes("/api/session-sync") && response.request().method() === "POST" && response.ok()
    ));
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.locator(".stage-pill")).toContainText("Step 1 of 5");
    await expect(page.getByPlaceholder("Write 1-3 sentences")).toHaveValue(firstAnswer);
    await savedBack;

    await page.reload({ waitUntil: "networkidle" });

    await expect(page.locator(".stage-pill")).toContainText("Step 1 of 5", { timeout: 15_000 });
    await expect(page.getByPlaceholder("Write 1-3 sentences")).toHaveValue(firstAnswer);
    expectHealthyClient(tracker);
  });

  test("restores a saved clarification after refresh", async ({ page, request }) => {
    const tracker = collectClientErrors(page);
    await openRegisteredAdolescentSession(page, request);

    const savedClarification = page.waitForResponse((response) => (
      response.url().includes("/api/session-sync") && response.request().method() === "POST" && response.ok()
    ));
    await page.getByRole("button", { name: "Need clarification" }).click();
    await expect(page.getByRole("button", { name: "Skip this step" })).toBeVisible();
    await savedClarification;

    await page.reload({ waitUntil: "networkidle" });

    await expect(page.locator(".stage-pill")).toContainText("Step 1 of 5", { timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Skip this step" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Clear and retry" })).toBeVisible();
    expectHealthyClient(tracker);
  });

  test("restores the next step after saving a clarification skip", async ({ page, request }) => {
    const tracker = collectClientErrors(page);
    await openRegisteredAdolescentSession(page, request);

    const savedClarification = page.waitForResponse((response) => (
      response.url().includes("/api/session-sync") && response.request().method() === "POST" && response.ok()
    ));
    await page.getByRole("button", { name: "Need clarification" }).click();
    await savedClarification;

    const savedSkip = page.waitForResponse((response) => (
      response.url().includes("/api/session-sync") && response.request().method() === "POST" && response.ok()
    ));
    await page.getByRole("button", { name: "Skip this step" }).click();
    await expect(page.locator(".stage-pill")).toContainText("Step 2 of 5");
    await savedSkip;

    await page.reload({ waitUntil: "networkidle" });

    await expect(page.locator(".stage-pill")).toContainText("Step 2 of 5", { timeout: 15_000 });
    await expect(page.locator(".record")).toHaveCount(2);
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
    const dashboardActions = page.locator(".action-bar");
    await dashboardActions.getByRole("link", { name: "Continue latest active session" }).click();

    await expect(page).toHaveURL(/resumeSessionId=/);
    await expect(page.locator(".stage-pill")).toContainText("Step 2 of 5", { timeout: 15_000 });
    await expect(page.getByPlaceholder("Write 1-3 sentences")).toHaveValue("");

    expectHealthyClient(tracker);
  });

  test("restores an active session after a page refresh", async ({ page, request }) => {
    const tracker = collectClientErrors(page);
    await openRegisteredAdolescentSession(page, request);

    await page.getByPlaceholder("Write 1-3 sentences").fill(
      "I will choose one clear first step for my math exam preparation today.",
    );
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.locator(".stage-pill")).toContainText("Step 2 of 5", { timeout: 15_000 });
    await expect(page.locator(".record")).toHaveCount(1);
    await expect(page).toHaveURL(/resumeSessionId=/);

    await page.reload({ waitUntil: "networkidle" });
    await expect(page.locator(".stage-pill")).toContainText("Step 2 of 5", { timeout: 15_000 });
    await expect(page.getByPlaceholder("e.g.: exam, project")).toHaveValue("math exam preparation");
    await expect(page.locator(".record")).toHaveCount(1);
    await expect(page.getByPlaceholder("Write 1-3 sentences")).toHaveValue("");

    expectHealthyClient(tracker);
  });

  test("restores an active session after browser Back and Forward", async ({ page, request }) => {
    const tracker = collectClientErrors(page);
    await openRegisteredAdolescentSession(page, request);

    await page.getByPlaceholder("Write 1-3 sentences").fill(
      "I will choose one clear first step for my math exam preparation today.",
    );
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.locator(".stage-pill")).toContainText("Step 2 of 5", { timeout: 15_000 });
    await expect(page).toHaveURL(/resumeSessionId=/);

    await page.goBack({ waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/student\/dashboard\?lang=en$/);

    await page.goForward({ waitUntil: "networkidle" });
    await expect(page).toHaveURL(/resumeSessionId=/);
    await expect(page.locator(".stage-pill")).toContainText("Step 2 of 5", { timeout: 15_000 });
    await expect(page.getByPlaceholder("e.g.: exam, project")).toHaveValue("math exam preparation");
    await expect(page.locator(".record")).toHaveCount(1);

    expectHealthyClient(tracker);
  });

  test("keeps submitted teacher feedback closed when reopening a completed session", async ({ page, request }) => {
    const tracker = collectClientErrors(page);
    const childId = await openRegisteredAdolescentSession(page, request);
    const sessionId = randomUUID();
    const updatedAt = new Date().toISOString();
    const records = ["1", "2", "3", "4", "5"].map((stageId) => ({
      stageId,
      stageTitle: `Stage ${stageId}`,
      scenario: "A",
      eventType: "answer",
      answer: `Completed answer for stage ${stageId}.`,
      feedback: "Keep this next step specific.",
      question: "What is your next step?",
      timestamp: updatedAt,
    }));

    const sessionResponse = await page.request.post("/api/session-sync", {
      data: {
        childId,
        sessionId,
        status: "completed",
        context: "science project preparation",
        finalNote: "I will prepare the first project section today.",
        updatedAt,
        lang: "en",
        adolescentFeedback: {
          rating: 5,
          comment: "The route was clear.",
          timestamp: updatedAt,
        },
        records,
      },
    });
    expect(sessionResponse.ok(), await sessionResponse.text()).toBe(true);

    await page.goto("/student/dashboard?lang=en", { waitUntil: "networkidle" });
    await page.getByRole("link", { name: "Review completion" }).click();
    await expect(page).toHaveURL(new RegExp(`resumeSessionId=${sessionId}`));
    await expect(page.getByText("Session completed")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Feedback saved.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Send feedback to teacher" })).toHaveCount(0);

    expectHealthyClient(tracker);
  });

  test("preserves records from concurrent session snapshots", async ({ page, request }) => {
    const tracker = collectClientErrors(page);
    const childId = await openRegisteredAdolescentSession(page, request);
    const sessionId = randomUUID();
    const firstTimestamp = "2026-07-19T10:00:00.000Z";
    const initialRecord = {
      stageId: "1",
      stageTitle: "Name the situation",
      scenario: "A",
      eventType: "answer",
      answer: "I need to organize the project outline.",
      feedback: "Start with one small, visible step.",
      question: "What needs attention?",
      timestamp: firstTimestamp,
    };

    const initialResponse = await page.request.post("/api/session-sync", {
      data: {
        childId,
        sessionId,
        status: "in_progress",
        context: "project outline",
        finalNote: "",
        updatedAt: firstTimestamp,
        lang: "en",
        records: [initialRecord],
      },
    });
    expect(initialResponse.ok(), await initialResponse.text()).toBe(true);

    const backRecord = {
      stageId: "1",
      stageTitle: "Name the situation",
      scenario: "clarify",
      eventType: "back",
      answer: "Returned to revise the previous answer.",
      feedback: "The learner returned to the previous question.",
      question: "What needs attention?",
      timestamp: "2026-07-19T10:01:00.000Z",
    };
    const secondStageRecord = {
      stageId: "2",
      stageTitle: "Set a goal",
      scenario: "A",
      eventType: "answer",
      answer: "Write the first three outline headings.",
      feedback: "Keep the next step concrete.",
      question: "What is the next step?",
      timestamp: "2026-07-19T10:02:00.000Z",
    };

    const [backResponse, nextStageResponse] = await Promise.all([
      page.request.post("/api/session-sync", {
        data: {
          childId, sessionId, status: "in_progress", context: "project outline", finalNote: "",
          updatedAt: "2026-07-19T10:01:01.000Z", lang: "en", records: [initialRecord, backRecord],
        },
      }),
      page.request.post("/api/session-sync", {
        data: {
          childId, sessionId, status: "in_progress", context: "project outline", finalNote: "",
          updatedAt: "2026-07-19T10:02:01.000Z", lang: "en", records: [initialRecord, secondStageRecord],
        },
      }),
    ]);
    expect(backResponse.ok(), await backResponse.text()).toBe(true);
    expect(nextStageResponse.ok(), await nextStageResponse.text()).toBe(true);

    const childResponse = await page.request.get(`/api/children?childId=${encodeURIComponent(childId)}`);
    expect(childResponse.ok(), await childResponse.text()).toBe(true);
    const childPayload = await childResponse.json();
    const syncedSession = childPayload.child.sessions.find((session: { sessionId?: string }) => session.sessionId === sessionId);
    expect(syncedSession.records).toHaveLength(3);
    expect(syncedSession.records.map((record: { eventType?: string }) => record.eventType)).toEqual([
      "answer", "back", "answer",
    ]);

    expectHealthyClient(tracker);
  });

  test("does not let a stale session update reopen a completed session", async ({ page, request }) => {
    const tracker = collectClientErrors(page);
    const childId = await openRegisteredAdolescentSession(page, request);
    const sessionId = randomUUID();
    const completedAt = "2026-07-22T10:02:00.000Z";
    const completedRecords = ["1", "2", "3", "4", "5"].map((stageId) => ({
      stageId,
      stageTitle: `Stage ${stageId}`,
      scenario: "A",
      eventType: "answer",
      answer: `Completed response for stage ${stageId}.`,
      feedback: "Keep the next step specific.",
      question: "What is the next step?",
      timestamp: `2026-07-22T10:0${Number(stageId) - 1}:00.000Z`,
    }));

    const completedResponse = await page.request.post("/api/session-sync", {
      data: {
        childId, sessionId, status: "completed", context: "project outline",
        finalNote: "I completed the outline plan.", updatedAt: completedAt, lang: "en", records: completedRecords,
      },
    });
    expect(completedResponse.ok(), await completedResponse.text()).toBe(true);

    const staleResponse = await page.request.post("/api/session-sync", {
      data: {
        childId, sessionId, status: "in_progress", context: "older outline draft",
        finalNote: "", updatedAt: "2026-07-22T10:01:30.000Z", lang: "en", records: completedRecords.slice(0, 2),
      },
    });
    expect(staleResponse.ok(), await staleResponse.text()).toBe(true);

    const childResponse = await page.request.get(`/api/children?childId=${encodeURIComponent(childId)}`);
    expect(childResponse.ok(), await childResponse.text()).toBe(true);
    const childPayload = await childResponse.json();
    const syncedSession = childPayload.child.sessions.find((session: { sessionId?: string }) => session.sessionId === sessionId);
    expect(syncedSession.status).toBe("completed");
    expect(syncedSession.finalNote).toBe("I completed the outline plan.");
    expect(syncedSession.context).toBe("project outline");

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

  test("preserves the prior answer on Back and clears the attempt on Start over", async ({ page, request }) => {
    const tracker = collectClientErrors(page);
    await openRegisteredAdolescentSession(page, request);

    const firstAnswer = "I will choose one realistic goal for my math exam preparation today.";
    const answerField = page.getByPlaceholder("Write 1-3 sentences");
    await answerField.fill(firstAnswer);
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.locator(".stage-pill")).toContainText("Step 2 of 5", { timeout: 15_000 });
    await expect(page.locator(".record")).toHaveCount(1);

    await page.getByRole("button", { name: "Go back" }).click();
    await expect(page.locator(".stage-pill")).toContainText("Step 1 of 5");
    await expect(answerField).toHaveValue(firstAnswer);
    await expect(page.locator(".record")).toHaveCount(2);

    await page.getByRole("button", { name: "Start over" }).click();
    await expect(page.locator(".stage-pill")).toContainText("Step 1 of 5");
    await expect(answerField).toHaveValue("");
    await expect(page.getByText("No answers yet.")).toBeVisible();
    await expect(page.locator(".record")).toHaveCount(0);
    await expect(page.getByPlaceholder("e.g.: exam, project")).toHaveValue("study project");
    await expect(page).toHaveURL(/mode=new/);

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

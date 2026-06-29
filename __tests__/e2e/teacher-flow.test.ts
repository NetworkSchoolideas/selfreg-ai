import { test, expect, type Page } from "@playwright/test";

const projectLandingUrl =
  process.env.NEXT_PUBLIC_PROJECT_LANDING_URL || "https://selfreg-ai-networkschool.vercel.app";

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

function expectHealthyClient(
  tracker: { pageErrors: string[]; consoleErrors: string[] },
  ignoredMessages: string[] = [],
) {
  const isIgnored = (message: string) => ignoredMessages.some((ignored) => message.includes(ignored));
  const pageErrors = tracker.pageErrors.filter((message) => !isIgnored(message));
  const consoleErrors = tracker.consoleErrors.filter((message) => !isIgnored(message));

  expect(pageErrors, `Unexpected page errors: ${pageErrors.join(" | ")}`).toEqual([]);
  expect(consoleErrors, `Unexpected console errors: ${consoleErrors.join(" | ")}`).toEqual([]);
}

test.describe("Public smoke flows", () => {
  test("home page exposes prototype entry points and landing link", async ({ page }) => {
    const tracker = collectClientErrors(page);

    await page.goto("/?lang=ru");

    await expect(page).toHaveURL(/\/\?lang=ru$/);
    await expect(page.getByRole("heading", { name: "SelfReg AI" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Открыть прототип" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Дашборд педагога" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Настройки API" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Лендинг проекта" })).toHaveAttribute(
      "href",
      projectLandingUrl,
    );

    expectHealthyClient(tracker);
  });

  test("role selection routes teacher to registration with preselected role", async ({ page }) => {
    const tracker = collectClientErrors(page);

    await page.goto("/role-selection?lang=ru");

    await expect(page).toHaveURL(/\/role-selection\?lang=ru$/);
    await expect(page.getByRole("heading", { name: "Выберите вашу роль" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Я учитель" })).toBeVisible();

    await Promise.all([
      page.waitForURL(/\/auth\/register\?role=teacher&lang=ru$/, { timeout: 15000 }),
      page.getByRole("link", { name: "Я учитель" }).click(),
    ]);

    await expect(page.getByRole("heading", { name: "Регистрация" })).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText("Создать аккаунт");

    expectHealthyClient(tracker);
  });

  test("login page renders email auth form", async ({ page }) => {
    const tracker = collectClientErrors(page);

    await page.goto("/auth/login?lang=ru");

    await expect(page).toHaveURL(/\/auth\/login\?lang=ru$/);
    await expect(page.getByRole("heading", { name: "Вход" })).toBeVisible();
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
    await expect(page.getByRole("button", { name: "Войти", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Создать аккаунт" })).toBeVisible();

    expectHealthyClient(tracker);
  });

  test("teacher register success page shows code and login CTA", async ({ page }) => {
    const tracker = collectClientErrors(page);

    await page.goto("/teacher/register-success?lang=ru&teacherCode=T123456");

    await expect(page).toHaveURL(/\/teacher\/register-success\?lang=ru&teacherCode=T123456$/);
    await expect(page.getByRole("heading", { name: "Регистрация успешна!" })).toBeVisible();
    await expect(page.locator(".code-value")).toHaveText("T123456");
    await expect(page.getByRole("link", { name: "Перейти ко входу" })).toBeVisible();

    expectHealthyClient(tracker);
  });

  test("teacher register success copy uses inline state without browser alert", async ({ page, context }) => {
    const tracker = collectClientErrors(page);
    const dialogs: string[] = [];

    page.on("dialog", (dialog) => {
      dialogs.push(dialog.message());
      void dialog.dismiss();
    });

    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/teacher/register-success?lang=en&teacherCode=T654321");

    const copyButton = page.getByRole("button", { name: "Copy" });
    await expect(copyButton).toBeVisible();
    await copyButton.click();
    await page.waitForTimeout(250);
    expect(dialogs).toEqual([]);

    expectHealthyClient(tracker);
  });

  test("teacher register page routes login CTA to teacher auth login", async ({ page }) => {
    const tracker = collectClientErrors(page);

    await page.goto("/teacher/register?lang=ru");

    await expect(page).toHaveURL(/\/teacher\/register\?lang=ru$/);
    await expect(page.getByRole("heading", { name: "Регистрация учителя" })).toBeVisible();
    await expect(page.getByPlaceholder("Иванов Иван Иванович")).toBeVisible();
    await expect(page.getByPlaceholder("Название школы")).toBeVisible();
    await expect(page.getByRole("link", { name: "Войти" })).toBeVisible();

    await page.getByRole("link", { name: "Войти" }).click();

    await expect(page).toHaveURL(/\/auth\/login\?role=teacher&lang=ru$/);
    await expect(page.getByRole("heading", { name: "Вход" })).toBeVisible();

    expectHealthyClient(tracker);
  });

  test("legacy teacher child route redirects into unified teacher dashboard", async ({ page }) => {
    const tracker = collectClientErrors(page);

    await page.goto("/");
    await page.evaluate(() => {
      window.localStorage.clear();
      window.localStorage.setItem("selfreg_onboarding_seen_teacher", "1");
    });

    await page.goto("/teacher?lang=ru");

    const childId = (await page.locator(".child-header-panel .font-mono").textContent())?.trim();
    expect(childId).toBeTruthy();

    await page.goto(`/teacher/dashboard/child?childId=${childId}&lang=ru`);
    await page.waitForURL(new RegExp(`/teacher\\?childId=${childId}&lang=ru$`), { timeout: 15000 });
    await expect(page.locator(".child-header-panel")).toContainText(childId!);

    expectHealthyClient(tracker);
  });

  test("student dashboard without childId shows guided error state", async ({ page }) => {
    const tracker = collectClientErrors(page);

    await page.goto("/student/dashboard?lang=ru");

    await expect(page).toHaveURL(/\/student\/dashboard\?lang=ru$/);
    await expect(page.getByRole("heading", { name: "Ошибка" })).toBeVisible();
    await expect(page.getByText("ID ученика не указан")).toBeVisible();
    await expect(page.getByRole("link", { name: "На главную" })).toBeVisible();

    expectHealthyClient(tracker, [
      "Failed to load resource: the server responded with a status of 404",
    ]);
  });

  test("teacher dashboard entry renders without runtime failure", async ({ page }) => {
    const tracker = collectClientErrors(page);

    await page.goto("/teacher?lang=ru");

    await expect(page).toHaveURL(/\/teacher\?lang=ru$/);
    await expect(page.getByText("Дашборд педагога")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Обзор учеников + инфографика" })).toBeVisible();
    await expect(page.getByRole("button", { name: "📥 CSV экспорт" })).toBeVisible();
    const sharedLink = page.getByRole("link", { name: "Старт" }).first();
    await expect(sharedLink).toHaveAttribute("href", /\/adolescent\?childId=/);
    expect(await sharedLink.getAttribute("href")).not.toContain("teacher=");

    expectHealthyClient(tracker);
  });

  test("teacher can add a student and create a new local session", async ({ page }) => {
    const tracker = collectClientErrors(page);
    const childName = `Автотест ${Date.now()}`;
    const sessionContext = `Контекст ${Date.now()}`;

    await page.addInitScript(() => {
      window.localStorage.clear();
      window.localStorage.setItem("selfreg_onboarding_seen_teacher", "1");
    });

    await page.goto("/teacher?lang=ru");

    await expect(page).toHaveURL(/\/teacher\?lang=ru$/);
    await expect(page.locator('input[name="childName"]')).toBeVisible();

    await page.locator('input[name="childName"]').fill(childName);
    await page.getByRole("button", { name: "+ Добавить" }).click();

    const studentHeader = page.locator(".child-header-panel");
    await expect(studentHeader).toBeVisible();
    await expect(studentHeader).toContainText("0 сессий");

    await studentHeader.locator(".session-context-input").fill(sessionContext);
    await studentHeader.getByRole("button", { name: "+ Новая сессия" }).click();

    await expect(studentHeader).toContainText("1 сессия");
    await expect(page.locator(".sessions-header")).toContainText("(1)");
    await expect(page.locator(".sessions-grid")).toContainText(sessionContext);
    await expect(page.locator("main")).toContainText(sessionContext);

    expectHealthyClient(tracker);
  });

  test("teacher deletes a session through the in-app confirmation dialog", async ({ page }) => {
    const tracker = collectClientErrors(page);
    const childName = `Delete flow ${Date.now()}`;
    const sessionContext = `Session ${Date.now()}`;
    const dialogs: string[] = [];

    page.on("dialog", (dialog) => {
      dialogs.push(dialog.message());
      void dialog.dismiss();
    });

    await page.addInitScript(() => {
      window.localStorage.clear();
      window.localStorage.setItem("selfreg_onboarding_seen_teacher", "1");
    });

    await page.goto("/teacher?lang=en");

    await page.locator('input[name="childName"]').fill(childName);
    await page.getByRole("button", { name: "+ Add" }).click();

    const studentHeader = page.locator(".child-header-panel");
    await expect(studentHeader).toContainText("0 sessions");

    await studentHeader.locator(".session-context-input").fill(sessionContext);
    await studentHeader.getByRole("button", { name: "+ New session" }).click();

    await expect(page.locator(".sessions-grid")).toContainText(sessionContext);
    await page.getByRole("button", { name: "Delete selected" }).click();

    const confirmDialog = page.locator(".modal-content");
    await expect(confirmDialog.getByRole("heading", { name: "Delete session" })).toBeVisible();
    await confirmDialog.getByRole("button", { name: "Delete", exact: true }).click();

    await expect(page.locator(".undo-bar")).toContainText("Session deleted.");
    await expect(page.locator(".sessions-header")).toContainText("(0)");
    await expect(page.locator(".empty-state-dashed")).toContainText("Student has no sessions yet.");
    expect(dialogs).toEqual([]);

    expectHealthyClient(tracker);
  });

  test("teacher dashboard loads server-backed child and analytics", async ({ page, request }) => {
    const tracker = collectClientErrors(page);
    const teacherId = `E2E_TEACHER_${Date.now()}`;
    const sessionId = crypto.randomUUID();
    const consentTimestamp = new Date().toISOString();
    const childName = `Серверный ученик ${Date.now()}`;

    const createChildResponse = await request.post("/api/children", {
      data: {
        name: childName,
        teacherId,
        consentGiven: true,
        consentTimestamp,
        realData: {
          fio: "Тестовый Ученик",
          klass: "9А",
        },
      },
    });
    expect(createChildResponse.ok()).toBe(true);

    const createChildPayload = await createChildResponse.json();
    const childId = createChildPayload.child.id as string;

    try {
      const createSessionResponse = await request.post("/api/session-sync", {
        data: {
          sessionId,
          childId,
          context: "Проверка серверного потока",
          finalNote: "Сессия завершена для server-backed e2e.",
          updatedAt: new Date(Date.parse(consentTimestamp) + 1_000).toISOString(),
          lang: "ru",
          records: [
            {
              stageId: "1",
              stageTitle: "Цель",
              scenario: "A",
              eventType: "answer",
              answer: "Проверяю загрузку teacher dashboard из Supabase.",
              feedback: "Данные сессии должны появиться в серверной аналитике.",
              question: "Что проверяем?",
              timestamp: consentTimestamp,
              provider: "mock",
              model: "local-mock",
              responseMode: "mock",
            },
          ],
        },
      });
      expect(createSessionResponse.ok()).toBe(true);

      await page.addInitScript(() => {
        window.localStorage.setItem("selfreg_onboarding_seen_teacher", "1");
      });

      await page.goto(`/teacher?teacher=${teacherId}&lang=ru`);

      await expect(page).toHaveURL(new RegExp(`/teacher\\?teacher=${teacherId}&lang=ru$`));
      await expect(page.getByText("Supabase · серверная синхронизация активна")).toBeVisible();
      await expect(page.locator(".dashboard-sidebar")).toContainText("(1)");
      await expect(page.locator(".dashboard-sidebar")).toContainText("есть реальные данные");

      const studentHeader = page.locator(".child-header-panel");
      await expect(studentHeader).toContainText("1 сессия");
      await expect(page.getByRole("button", { name: "Раскрыть ФИО и класс" })).toBeVisible();
      await page.getByRole("button", { name: "Раскрыть ФИО и класс" }).click();
      await expect(studentHeader).toContainText("Тестовый Ученик");
      await expect(studentHeader).toContainText("9А");

      const analyticsPanel = page.locator(".analytics-panel");
      await expect(analyticsPanel).toBeVisible();
      await expect(analyticsPanel).toContainText("1");
      await expect(page.locator(".sessions-grid")).toContainText("Проверка серверного потока");

      expectHealthyClient(tracker);
    } finally {
      await request.delete(`/api/children?childId=${encodeURIComponent(childId)}&teacherId=${encodeURIComponent(teacherId)}`);
    }
  });
});

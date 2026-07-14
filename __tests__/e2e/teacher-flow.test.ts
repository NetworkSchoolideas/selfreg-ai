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
  test("home page exposes app entry points and landing link", async ({ page }) => {
    const tracker = collectClientErrors(page);

    await page.goto("/?lang=ru");

    await expect(page).toHaveURL(/\/\?lang=ru$/);
    await expect(page.getByRole("button", { name: "Войти" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Поддержка саморегуляции в период взросления" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Начать сессию" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Кабинет педагога" })).toBeVisible();
    await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);

    const apiGuideTab = page.getByRole("tab", { name: "Ключ GitHub API" });
    await expect(apiGuideTab).toBeVisible();
    await apiGuideTab.click();
    await expect(page.getByRole("link", { name: "Открыть настройки API" })).toBeVisible();

    await expect(page.getByRole("link", { name: "Лендинг проекта ↗" })).toHaveAttribute(
      "href",
      projectLandingUrl,
    );

    expectHealthyClient(tracker);
  });

  test("role selection routes teacher to the dedicated teacher registration flow", async ({ page }) => {
    const tracker = collectClientErrors(page);

    await page.goto("/role-selection?lang=ru");

    await expect(page).toHaveURL(/\/role-selection\?lang=ru$/);
    await expect(page.getByRole("heading", { name: "Выберите вашу роль" })).toBeVisible();

    const teacherRoleCard = page.locator('a[href="/teacher/register?lang=ru"]').first();
    await expect(teacherRoleCard).toBeVisible();

    await Promise.all([
      page.waitForURL(/\/teacher\/register\?lang=ru$/, { timeout: 15000 }),
      teacherRoleCard.click(),
    ]);

    await expect(page.getByRole("heading", { name: "Регистрация педагога" })).toBeVisible();
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

  test("teacher register success supports dashboard and pending-email states", async ({ page }) => {
    const tracker = collectClientErrors(page);

    await page.goto("/teacher/register-success?lang=en&teacherCode=T777777&next=dashboard");
    await expect(page.getByRole("link", { name: "Go to dashboard" })).toBeVisible();

    await page.goto("/teacher/register-success?lang=en&teacherCode=T888888&pendingEmail=1");
    await expect(page.getByText("Confirm your email, then sign in.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to login" })).toBeVisible();

    expectHealthyClient(tracker);
  });

  test("teacher register page routes login CTA to teacher auth login", async ({ page }) => {
    const tracker = collectClientErrors(page);

    await page.goto("/teacher/register?lang=ru");

    await expect(page).toHaveURL(/\/teacher\/register\?lang=ru$/);
    await expect(page.getByRole("heading", { name: "Регистрация педагога" })).toBeVisible();
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
    await expect(page.getByRole("button", { name: "CSV Экспорт" })).toBeVisible();
    const sharedLink = page.getByRole("link", { name: "Старт" }).first();
    await expect(sharedLink).toHaveAttribute("href", /\/adolescent\?childId=/);
    expect(await sharedLink.getAttribute("href")).not.toContain("teacher=");

    expectHealthyClient(tracker);
  });

  test("teacher session list is read-only", async ({ page }) => {
    const tracker = collectClientErrors(page);
    const childName = `Автотест ${Date.now()}`;

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
    await expect(page.locator(".sessions-header")).toContainText("(0)");
    await expect(page.locator(".sessions-header")).toContainText("Только просмотр");
    await expect(page.locator(".session-context-input")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "+ Новая сессия" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Удалить выбранную" })).toHaveCount(0);

    expectHealthyClient(tracker);
  });

  test("teacher session list hides destructive controls in English", async ({ page }) => {
    const tracker = collectClientErrors(page);
    const childName = `Delete flow ${Date.now()}`;

    await page.addInitScript(() => {
      window.localStorage.clear();
      window.localStorage.setItem("selfreg_onboarding_seen_teacher", "1");
    });

    await page.goto("/teacher?lang=en");

    await page.locator('input[name="childName"]').fill(childName);
    await page.getByRole("button", { name: "+ Add" }).click();

    const studentHeader = page.locator(".child-header-panel");
    await expect(studentHeader).toContainText("0 sessions");
    await expect(page.locator(".sessions-header")).toContainText("(0)");
    await expect(page.locator(".sessions-header")).toContainText("Read-only");
    await expect(page.locator(".empty-state-dashed")).toContainText("Student has no sessions yet.");
    await expect(page.locator(".session-context-input")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "+ New session" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Delete selected" })).toHaveCount(0);

    expectHealthyClient(tracker);
  });

  // Restored in P0-05 once the E2E setup can create an explicitly linked teacher/student pair.
  test.skip("teacher dashboard loads server-backed child and analytics", async ({ page, request }) => {
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

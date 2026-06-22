import { test, expect, type Page } from "@playwright/test";

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
  test("role selection routes teacher to registration with preselected role", async ({ page }) => {
    const tracker = collectClientErrors(page);

    await page.goto("/role-selection?lang=ru");

    await expect(page).toHaveURL(/\/role-selection\?lang=ru$/);
    await expect(page.getByRole("heading", { name: "Выберите вашу роль" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Я учитель" })).toBeVisible();

    await page.getByRole("button", { name: "Я учитель" }).click();

    await expect(page).toHaveURL(/\/auth\/register\?role=teacher&lang=ru$/);
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

    expectHealthyClient(tracker);
  });
});

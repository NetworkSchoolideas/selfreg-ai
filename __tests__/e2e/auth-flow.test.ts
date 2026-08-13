import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const e2eSecret = process.env.SELFREG_E2E_SECRET || "local-e2e-secret";

const teacherUser = {
  email: "selfreg.playwright.teacher@selfreg.test",
  password: "Test123!Teacher",
  role: "teacher" as const,
  fullName: "Playwright Teacher",
  school: "E2E School",
};

const studentUser = {
  email: "selfreg.playwright.student@selfreg.test",
  password: "Test123!Student",
  role: "student" as const,
  fullName: "Playwright Student",
};

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

async function ensureConfirmedUsers(request: APIRequestContext) {
  const response = await request.post("/api/e2e/setup", {
    headers: {
      "x-e2e-secret": e2eSecret,
    },
    data: {
      users: [teacherUser, studentUser],
    },
  });

  expect(response.ok()).toBe(true);
}

async function loginViaForm(page: Page, role: "teacher" | "student", email: string, password: string) {
  await page.goto(`/auth/login?role=${role}&lang=ru`, { waitUntil: "networkidle" });
  await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();
  const passwordInput = page.locator(".password-input-row input");
  await expect(passwordInput).not.toHaveAttribute("minlength");
  await expect(passwordInput).toHaveAttribute("placeholder", "Введите пароль");
  const passwordToggle = page.locator(".password-toggle");
  await expect(passwordToggle).toBeVisible();
  await passwordToggle.click();
  await expect(passwordInput).toHaveAttribute("type", "text");
  await passwordToggle.click();
  await expect(passwordInput).toHaveAttribute("type", "password");
  await page.getByPlaceholder("you@example.com").fill(email);
  await passwordInput.fill(password);
  await page.locator('button[type="submit"]').click({ noWaitAfter: true });
}

test.describe("Authentication and RBAC", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async ({ request }) => {
    await ensureConfirmedUsers(request);
  });

  test("teacher login reaches dashboard and student route redirects back", async ({ page }) => {
    const tracker = collectClientErrors(page);

    await loginViaForm(page, "teacher", teacherUser.email, teacherUser.password);

    await expect(page).toHaveURL(/\/teacher\?lang=ru$/, { timeout: 15000 });
    await expect(page.locator("h1")).toContainText("Подготовка разговора с учеником");

    await page.goto("/?lang=ru");
    await expect(page.getByRole("link", { name: "Кабинет педагога" })).toHaveAttribute("href", "/teacher?lang=ru");
    const personalSessionLinks = page.getByRole("link", { name: "Личная сессия" });
    await expect(personalSessionLinks).toHaveCount(2);
    await expect(personalSessionLinks.first()).toHaveAttribute("href", "/adolescent?lang=ru");

    await page.goto("/student/dashboard?lang=ru");

    await expect(page).toHaveURL(/\/teacher\?lang=ru$/, { timeout: 15000 });
    await expect(page.locator("h1")).toContainText("Подготовка разговора с учеником");

    expectHealthyClient(tracker);
  });

  test("student login resolves current dashboard and teacher route redirects back", async ({ page }) => {
    const tracker = collectClientErrors(page);

    await loginViaForm(page, "student", studentUser.email, studentUser.password);

    await expect(page).toHaveURL(/\/student\/dashboard\?lang=ru$/, { timeout: 15000 });
    await expect(page.locator("h1")).toContainText("кабинет");
    await expect(page.locator(".profile-field").filter({ hasText: "Playwright Student" }).first()).toBeVisible();
    await expect(page.getByText("не указан")).toHaveCount(0);

    await page.goto("/teacher?lang=ru");

    await expect(page).toHaveURL(/\/student\/dashboard\?lang=ru$/, { timeout: 15000 });
    await expect(page.locator("h1")).toContainText("кабинет");

    await page.goto("/?lang=ru");
    await expect(page.getByRole("link", { name: "Мой кабинет" })).toHaveAttribute("href", "/student/dashboard?lang=ru");
    await expect(page.getByRole("link", { name: "Кабинет педагога" })).toHaveCount(0);
    await page.getByRole("tab", { name: "Педагогу" }).click();
    await expect(page.getByText("Кабинет педагога доступен только в аккаунте педагога.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Открыть кабинет педагога" })).toHaveCount(0);

    expectHealthyClient(tracker);
  });

  test("student dashboard clears cached session data after logout", async ({ page }) => {
    const tracker = collectClientErrors(page);

    await loginViaForm(page, "student", studentUser.email, studentUser.password);
    await expect(page).toHaveURL(/\/student\/dashboard\?lang=ru$/, { timeout: 15000 });
    await expect(page.locator("h1")).toContainText("кабинет");

    await page.getByRole("button", { name: "Выйти" }).click();

    await expect(page.getByRole("heading", { name: "Ошибка" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "История сессий" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Продолжить последнюю активную сессию" })).toHaveCount(0);

    expectHealthyClient(tracker);
  });

  test("teacher dashboard clears the authenticated dashboard after logout", async ({ page }) => {
    const tracker = collectClientErrors(page);

    await loginViaForm(page, "teacher", teacherUser.email, teacherUser.password);
    await expect(page).toHaveURL(/\/teacher\?lang=ru$/, { timeout: 15000 });
    await expect(page.locator("h1")).toBeVisible();

    const onboardingClose = page.locator(".modal-overlay .modal-close");
    if (await onboardingClose.count()) {
      await onboardingClose.click();
    }

    await page.getByRole("button", { name: "\u0412\u044b\u0439\u0442\u0438" }).click();

    await expect(page.locator(".no-selection-panel")).toBeVisible();
    await expect(page.locator(".dashboard-grid")).toHaveCount(0);

    expectHealthyClient(tracker);
  });
});

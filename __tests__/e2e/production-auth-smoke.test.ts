import { expect, test } from "@playwright/test";

const productionUrl = "https://selfreg-ai.vercel.app";
const hasProductionBaseUrl = process.env.PLAYWRIGHT_BASE_URL === productionUrl;
const teacherEmail = process.env.SELFREG_PRODUCTION_TEACHER_EMAIL;
const teacherPassword = process.env.SELFREG_PRODUCTION_TEACHER_PASSWORD;
const studentEmail = process.env.SELFREG_PRODUCTION_STUDENT_EMAIL;
const studentPassword = process.env.SELFREG_PRODUCTION_STUDENT_PASSWORD;

async function login(page: import("@playwright/test").Page, role: "teacher" | "student", email: string, password: string) {
  await page.goto(`/auth/login?role=${role}&lang=ru`, { waitUntil: "networkidle" });
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.locator(".password-input-row input").fill(password);
  await page.locator('button[type="submit"]').click();
}

test.describe("Production account smoke", () => {
  test.skip(
    !hasProductionBaseUrl || !teacherEmail || !teacherPassword || !studentEmail || !studentPassword,
    "Run only against production with SELFREG_PRODUCTION_* credentials supplied through the environment.",
  );

  test("student Gmail account opens only the student workspace", async ({ page }) => {
    await login(page, "student", studentEmail!, studentPassword!);

    await expect(page).toHaveURL(/\/student\/dashboard(?:\?lang=(?:ru|en))?$/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "Личный кабинет" })).toBeVisible();
    await expect(page.getByText("ID ученика не указан")).toHaveCount(0);
  });

  test("teacher Gmail account opens the teacher dashboard", async ({ page }) => {
    await login(page, "teacher", teacherEmail!, teacherPassword!);

    await expect(page).toHaveURL(/\/teacher(?:\?.*)?$/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "Обзор учеников + инфографика" })).toBeVisible();
    await expect(page.getByText("Код педагога")).toBeVisible();
  });
});

import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const e2eSecret = process.env.SELFREG_E2E_SECRET || "local-e2e-secret";
const liveApiKey = process.env.SELFREG_LIVE_AI_API_KEY;
const liveProvider = process.env.SELFREG_LIVE_AI_PROVIDER || "openrouter";
const liveModel = process.env.SELFREG_LIVE_AI_MODEL || "openrouter/free";

test.use({ trace: "off", screenshot: "off", video: "off" });

async function createAndLoginStudent(page: Page, request: APIRequestContext) {
  const timestamp = Date.now();
  const email = `selfreg.playwright.live.${timestamp}@selfreg.test`;
  const password = "Test123!Live";
  const setupResponse = await request.post("/api/e2e/setup", {
    headers: { "x-e2e-secret": e2eSecret },
    data: { users: [{ email, password, role: "student", fullName: `Live AI Student ${timestamp}` }] },
  });
  expect(setupResponse.ok()).toBe(true);

  await page.goto("/auth/login?role=student&lang=en", { waitUntil: "networkidle" });
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.locator(".password-input-row input").fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/student\/dashboard\?lang=en$/, { timeout: 15_000 });
}

test.describe("Live AI scenario pair", () => {
  test.skip(
    !liveApiKey,
    "Set SELFREG_LIVE_AI_API_KEY only in the local shell to run this opt-in live provider test.",
  );

  test("returns adjacent deterministic scenarios A then B through the selected live provider", async ({ page, request }) => {
    await createAndLoginStudent(page, request);

    const callChat = (answer: string, currentStage: "1" | "2") =>
      page.evaluate(
        async ({ answer, currentStage, provider, model, apiKey }) => {
          const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: "live-ai-e2e",
              answer,
              currentStage,
              context: "exam preparation",
              provider,
              model,
              userApiKey: apiKey,
              lang: "en",
              history: [],
            }),
          });
          return { status: response.status, payload: await response.json() };
        },
        { answer, currentStage, provider: liveProvider, model: liveModel, apiKey: liveApiKey! },
      );

    const scenarioA = await callChat(
      "I want to calmly prepare for my exam by solving five practice tasks and reviewing the result.",
      "1",
    );
    expect(scenarioA.status).toBe(200);
    expect(scenarioA.payload).toEqual(expect.objectContaining({ scenario: "A", responseMode: "llm-json" }));
    expect(scenarioA.payload.feedback).toEqual(expect.any(String));

    const scenarioB = await callChat(
      "I am stuck, cannot start, and feel like I need to do everything at once.",
      "2",
    );
    expect(scenarioB.status).toBe(200);
    expect(scenarioB.payload).toEqual(expect.objectContaining({ scenario: "B", responseMode: "llm-json" }));
    expect(scenarioB.payload.feedback).toEqual(expect.any(String));
  });
});

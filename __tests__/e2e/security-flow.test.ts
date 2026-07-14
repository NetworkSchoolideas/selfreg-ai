import { expect, test } from "@playwright/test";

test.describe("Session write access", () => {
  test("rejects anonymous session writes and deletes", async ({ request }) => {
    const syncResponse = await request.post("/api/session-sync", {
      data: {
        action: "delete",
        childId: "00000000-0000-4000-8000-000000000001",
        sessionId: "00000000-0000-4000-8000-000000000002",
      },
    });
    const deleteResponse = await request.delete(
      "/api/sessions?childId=00000000-0000-4000-8000-000000000001&sessionId=00000000-0000-4000-8000-000000000002",
    );
    const feedbackResponse = await request.post("/api/session-feedback", {
      data: {
        childId: "00000000-0000-4000-8000-000000000001",
        historyInsight: "Test",
      },
    });

    expect(syncResponse.status()).toBe(401);
    expect(deleteResponse.status()).toBe(401);
    expect(feedbackResponse.status()).toBe(401);
  });
});

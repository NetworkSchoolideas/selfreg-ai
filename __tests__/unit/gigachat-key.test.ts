import { validateGigaChatKey } from "@/lib/gigachat-key";

describe("GigaChat Authorization Key validation", () => {
  it("accepts a base64-encoded client credential pair", () => {
    expect(validateGigaChatKey(Buffer.from("client-id:client-secret").toString("base64"))).toBe(true);
  });

  it("rejects malformed or incomplete values", () => {
    expect(validateGigaChatKey("not-base64")).toBe(false);
    expect(validateGigaChatKey(Buffer.from("client-id").toString("base64"))).toBe(false);
  });
});

import { isGoogleAuthEnabled } from "@/lib/auth-config";

const originalEnv = process.env;

describe("auth config", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED;
    delete process.env.NEXT_PUBLIC_GOOGLE_AUTH_BETA_ACK;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("keeps Google auth disabled by default", () => {
    expect(isGoogleAuthEnabled()).toBe(false);
  });

  it("does not enable Google auth with the legacy flag alone", () => {
    process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED = "true";

    expect(isGoogleAuthEnabled()).toBe(false);
  });

  it("requires an explicit beta acknowledgement flag", () => {
    process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED = "true";
    process.env.NEXT_PUBLIC_GOOGLE_AUTH_BETA_ACK = "true";

    expect(isGoogleAuthEnabled()).toBe(true);
  });
});

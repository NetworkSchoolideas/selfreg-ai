describe("runtime configuration", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  it("does not require a usable encryption key when stored user keys are disabled", () => {
    process.env.ALLOW_STORED_USER_KEYS = "false";
    process.env.APP_ENCRYPTION_KEY = "short";

    expect(() => {
      jest.isolateModules(() => require("@/lib/config"));
    }).not.toThrow();
  });

  it("requires a strong encryption key when stored user keys are enabled", () => {
    process.env.ALLOW_STORED_USER_KEYS = "true";
    process.env.APP_ENCRYPTION_KEY = "short";

    expect(() => {
      jest.isolateModules(() => require("@/lib/config"));
    }).toThrow("APP_ENCRYPTION_KEY must contain at least 16 characters");
  });
});

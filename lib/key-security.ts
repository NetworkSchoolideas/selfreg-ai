function isTrue(value?: string) {
  return value === "true";
}

export function canUseEphemeralUserKey() {
  return isTrue(process.env.ALLOW_EPHEMERAL_USER_KEYS ?? "true");
}

export function canStoreUserKeys() {
  return isTrue(process.env.ALLOW_STORED_USER_KEYS ?? "false");
}

export function assertUserKeyPolicy(userApiKey?: string) {
  if (userApiKey && !canUseEphemeralUserKey()) {
    throw new Error("Ephemeral user API keys are disabled");
  }

  if (canStoreUserKeys() && !process.env.APP_ENCRYPTION_KEY) {
    throw new Error("APP_ENCRYPTION_KEY is required before storing user API keys");
  }
}

export function redactSecret(value: string) {
  if (value.length <= 8) return "********";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

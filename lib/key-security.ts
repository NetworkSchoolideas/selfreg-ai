import { config, security } from "@/lib/config";

export function canUseEphemeralUserKey() {
  return security.allowEphemeralKeys;
}

export function canStoreUserKeys() {
  return security.allowStoredKeys;
}

export function assertUserKeyPolicy(userApiKey?: string) {
  if (userApiKey && !canUseEphemeralUserKey()) {
    throw new Error("Ephemeral user API keys are disabled");
  }

  if (canStoreUserKeys() && !config.APP_ENCRYPTION_KEY) {
    throw new Error("APP_ENCRYPTION_KEY is required before storing user API keys");
  }
}

export function redactSecret(value: string) {
  if (value.length <= 8) return "********";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

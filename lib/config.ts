/**
 * Centralized and validated environment configuration.
 *
 * This is the single source of truth for all runtime configuration.
 * All environment variables should be accessed through this module.
 *
 * Why this exists:
 * - Prevents scattered process.env usage
 * - Provides early validation at startup
 * - Makes configuration explicit and documented
 * - Improves type safety
 */

import { z } from "zod";

const EnvSchema = z.object({
  // === AI Provider Selection ===
  DEFAULT_AI_PROVIDER: z.enum(["mock", "gigachat", "openrouter", "groq", "github-models", "vercel-gateway"]).optional(),
  AI_PROVIDER: z.enum(["mock", "gigachat", "openrouter", "groq", "github-models", "vercel-gateway"]).optional(), // legacy

  // === GigaChat ===
  GIGACHAT_CREDENTIALS: z.string().optional(),
  GIGACHAT_AUTH_URL: z.string().url().optional(),
  GIGACHAT_API_URL: z.string().url().optional(),
  GIGACHAT_MODEL: z.string().optional(),
  GIGACHAT_SCOPE: z.string().optional(),

  // === OpenRouter ===
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().optional(),

  // === Groq ===
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().optional(),

  // === GitHub Models ===
  GITHUB_MODELS_TOKEN: z.string().optional(),
  GITHUB_TOKEN: z.string().optional(), // fallback
  GITHUB_MODELS_API_URL: z.string().url().optional(),
  GITHUB_MODELS_API_VERSION: z.string().optional(),
  GITHUB_MODELS_MODEL: z.string().optional(),

  // === Vercel AI Gateway ===
  AI_GATEWAY_API_KEY: z.string().optional(),
  AI_GATEWAY_MODEL: z.string().optional(),

  // === Application / Security ===
  APP_BASE_URL: z.string().url().optional(),
  ALLOW_EPHEMERAL_USER_KEYS: z.enum(["true", "false"]).optional().default("true"),
  ALLOW_STORED_USER_KEYS: z.enum(["true", "false"]).optional().default("false"),
  APP_ENCRYPTION_KEY: z.string().optional(), // validated only when stored keys are enabled

  // === Development / Misc ===
  NODE_ENV: z.enum(["development", "production", "test"]).optional().default("development"),
});

export type AppConfig = z.infer<typeof EnvSchema>;

function loadConfig(): AppConfig {
  const parsed = EnvSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("❌ Invalid environment configuration:");
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error("Environment validation failed. Check your .env or Vercel environment variables.");
  }

  const config = parsed.data;

  // Additional business rules
  if (config.ALLOW_STORED_USER_KEYS === "true" && (!config.APP_ENCRYPTION_KEY || config.APP_ENCRYPTION_KEY.length < 16)) {
    throw new Error("APP_ENCRYPTION_KEY must contain at least 16 characters when stored user API keys are enabled.");
  }

  return config;
}

// Singleton config instance (validated once on import)
export const config = loadConfig();

// Convenience helpers (recommended way to access config)
export const ai = {
  defaultProvider: (config.DEFAULT_AI_PROVIDER || config.AI_PROVIDER || "mock") as AppConfig["DEFAULT_AI_PROVIDER"],
};

export const security = {
  allowEphemeralKeys: config.ALLOW_EPHEMERAL_USER_KEYS === "true",
  allowStoredKeys: config.ALLOW_STORED_USER_KEYS === "true",
  hasEncryptionKey: !!config.APP_ENCRYPTION_KEY,
};

// General app settings (safe defaults)
export const app = {
  baseUrl: () => config.APP_BASE_URL || "http://localhost:3000",
};

// === Provider-specific config helpers (recommended way — stops direct process.env usage) ===
export const providers = {
  github: {
    token: () => config.GITHUB_MODELS_TOKEN || config.GITHUB_TOKEN,
    apiUrl: () => config.GITHUB_MODELS_API_URL,
    apiVersion: () => config.GITHUB_MODELS_API_VERSION,
    model: (override?: string) => override || config.GITHUB_MODELS_MODEL || "openai/gpt-4o-mini",
  },
  openrouter: {
    apiKey: () => config.OPENROUTER_API_KEY,
    model: (override?: string) => override || config.OPENROUTER_MODEL || "openrouter/free",
  },
  groq: {
    apiKey: () => config.GROQ_API_KEY,
    model: (override?: string) => override || config.GROQ_MODEL || "openai/gpt-oss-20b",
  },
  vercelGateway: {
    apiKey: () => config.AI_GATEWAY_API_KEY,
    model: (override?: string) => override || config.AI_GATEWAY_MODEL || "openai/gpt-oss-120b",
  },
  gigachat: {
    credentials: () => config.GIGACHAT_CREDENTIALS,
    authUrl: () => config.GIGACHAT_AUTH_URL || "https://ngw.devices.sberbank.ru:9443/api/v2/oauth",
    apiUrl: () => config.GIGACHAT_API_URL,
    model: (override?: string) => override || config.GIGACHAT_MODEL || "GigaChat-2",
    scope: () => config.GIGACHAT_SCOPE || "GIGACHAT_API_PERS",
  },
};

export default config;

/**
 * Usage examples:
 *
 * import { config, ai, security, providers, app } from "@/lib/config";
 *
 * const provider = ai.defaultProvider;
 * const apiKey = input.userApiKey || providers.openrouter.apiKey();
 * const referer = app.baseUrl();
 */

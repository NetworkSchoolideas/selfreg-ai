import type { AppLang } from "@/lib/app-i18n";

export type ProviderId = "mock" | "gigachat" | "openrouter" | "groq" | "github-models" | "vercel-gateway";
export type ProviderReleaseStatus = "recommended" | "advanced" | "in-development" | "fallback" | "hidden" | "retired";

export const DEFAULT_LIVE_PROVIDER: ProviderId = "openrouter";
export const DEFAULT_LIVE_MODEL = "openrouter/free";

// Current Groq models suitable for learner-facing RU/EN chat completion.
// Compound routes use tools, and the Llama 3.x IDs leave the free/developer
// tier on 2026-08-16, so neither belongs in a stable self-regulation session.
export const GROQ_FREE_CHAT_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.6-27b",
] as const;

// Current individual Freemium model IDs. The Studio project dashboard exposes
// these four current tiers; legacy aliases such as `GigaChat` can return 404
// for recently created projects, so they are deliberately not selectable.
// Keep the list constrained rather than accepting an arbitrary value.
export const GIGACHAT_SESSION_MODELS = [
  "GigaChat-2",
  "GigaChat-2-Pro",
  "GigaChat-2-Max",
  "GigaChat-3-Ultra",
] as const;

export function getFreeChatModels(providerId: ProviderId): readonly string[] | null {
  if (providerId === "groq") return GROQ_FREE_CHAT_MODELS;
  if (providerId === "gigachat") return GIGACHAT_SESSION_MODELS;
  return null;
}

type ProviderMeta = {
  id: ProviderId;
  title: string;
  releaseStatus: ProviderReleaseStatus;
  keyLabel: string;
  defaultModel: string;
  note: { ru: string; en: string };
  docsUrl: string;
};

export const PROVIDERS: ProviderMeta[] = [
  {
    id: "mock",
    title: "Mock",
    releaseStatus: "fallback",
    keyLabel: "not required",
    defaultModel: "local-mock",
    note: {
      ru: "Безопасный режим для показа логики без внешнего API. Для тестирования.",
      en: "Safe mode for testing without external API."
    },
    docsUrl: "/"
  },
  {
    id: "github-models",
    title: "GitHub Models",
    releaseStatus: "retired",
    keyLabel: "GITHUB_TOKEN",
    defaultModel: DEFAULT_LIVE_MODEL,
    note: {
      ru: "GitHub Models прекращён GitHub и больше не доступен для новых подключений.",
      en: "GitHub Models has been retired by GitHub and is no longer available for new connections."
    },
    docsUrl: "https://docs.github.com/ru/github-models/use-github-models/prototyping-with-ai-models"
  },
  {
    id: "openrouter",
    title: "OpenRouter",
    releaseStatus: "recommended",
    keyLabel: "OPENROUTER_API_KEY",
    defaultModel: "openrouter/free",
    note: {
      ru: "Основной внешний вариант для прототипа. Проверьте ключ и модель перед началом сессии: бесплатные модели имеют лимиты и не гарантируют доступность.",
      en: "Primary external option for the prototype. Check the key and model before a session: free models have limits and no availability guarantee."
    },
    docsUrl: "https://openrouter.ai/docs/models"
  },
  {
    id: "groq",
    title: "Groq",
    releaseStatus: "advanced",
    keyLabel: "GROQ_API_KEY",
    defaultModel: "openai/gpt-oss-20b",
    note: {
      ru: "Резервный бесплатный BYOK-вариант с open-weight моделями. Лимиты бесплатного тарифа действуют на организацию и могут меняться.",
      en: "Alternative free-tier BYOK option with open-weight models. Free limits apply per organization and may change."
    },
    docsUrl: "https://console.groq.com/docs/quickstart"
  },
  {
    id: "gigachat",
    title: "GigaChat (Direct)",
    releaseStatus: "advanced",
    keyLabel: "GIGACHAT_CREDENTIALS",
    defaultModel: "GigaChat-2",
    note: {
      ru: "Бесплатный вариант для физлиц. Нужен Authorization Key проекта; приложение безопасно обменивает его на короткоживущий токен на сервере.",
      en: "Free option for individuals. Requires a project Authorization Key, exchanged for a short-lived token on the server."
    },
    docsUrl: "https://developers.sber.ru/docs/ru/gigachat/api/reference/rest/gigachat-api"
  },
  {
    id: "vercel-gateway",
    title: "Vercel AI Gateway",
    releaseStatus: "hidden",
    keyLabel: "AI_GATEWAY_API_KEY",
    defaultModel: "openai/gpt-oss-120b",
    note: {
      ru: "Экспериментальный вариант для Vercel-first инфраструктуры. Требует отдельной настройки AI Gateway.",
      en: "Experimental option for Vercel-first infrastructure. Requires separate AI Gateway setup."
    },
    docsUrl: "https://vercel.com/docs/ai-gateway"
  }
];

export function getProviderMeta(providerId: ProviderId, lang: AppLang = "ru") {
  const provider = PROVIDERS.find((item) => item.id === providerId)!;
  return {
    ...provider,
    note: lang === "en" ? provider.note.en : provider.note.ru
  };
}

export function getReleaseProviders() {
  return PROVIDERS.filter((provider) => provider.releaseStatus !== "hidden" && provider.releaseStatus !== "retired");
}

export function isProviderEnabledInRelease(providerId: ProviderId) {
  const provider = PROVIDERS.find((item) => item.id === providerId);
  return provider?.releaseStatus === "recommended" || provider?.releaseStatus === "advanced" || provider?.releaseStatus === "fallback";
}

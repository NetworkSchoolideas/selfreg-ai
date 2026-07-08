import type { AppLang } from "@/lib/app-i18n";

export type ProviderId = "mock" | "gigachat" | "openrouter" | "github-models" | "vercel-gateway";

export const DEFAULT_LIVE_PROVIDER: ProviderId = "github-models";
export const DEFAULT_LIVE_MODEL = "openai/gpt-4o-mini";

type ProviderMeta = {
  id: ProviderId;
  title: string;
  keyLabel: string;
  defaultModel: string;
  note: { ru: string; en: string };
  docsUrl: string;
};

export const PROVIDERS: ProviderMeta[] = [
  {
    id: "mock",
    title: "Mock",
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
    keyLabel: "GITHUB_TOKEN",
    defaultModel: DEFAULT_LIVE_MODEL,
    note: {
      ru: "Рекомендуемый провайдер для текущего тестирования. Требует GitHub token с правом read:models.",
      en: "Recommended provider for current testing. Requires a GitHub token with read:models scope."
    },
    docsUrl: "https://docs.github.com/ru/github-models/use-github-models/prototyping-with-ai-models"
  },
  {
    id: "openrouter",
    title: "OpenRouter",
    keyLabel: "OPENROUTER_API_KEY",
    defaultModel: "openrouter/free",
    note: {
      ru: "Альтернативный провайдер-маршрутизатор. Используйте после отдельной проверки ключа и выбранной модели.",
      en: "Alternative routing provider. Use after checking the key and selected model separately."
    },
    docsUrl: "https://openrouter.ai/docs/models"
  },
  {
    id: "gigachat",
    title: "GigaChat (Direct)",
    keyLabel: "GIGACHAT_AUTH_KEY",
    defaultModel: "GigaChat",
    note: {
      ru: "Экспериментальный прямой доступ. Требует base64(Client_ID:Client_Secret) и отдельной проверки подключения.",
      en: "Experimental direct access. Requires base64(Client_ID:Client_Secret) and a separate connection check."
    },
    docsUrl: "https://developers.sber.ru/docs/ru/gigachat/api/reference/rest/gigachat-api"
  },
  {
    id: "vercel-gateway",
    title: "Vercel AI Gateway",
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

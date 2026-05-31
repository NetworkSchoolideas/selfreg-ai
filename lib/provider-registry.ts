import type { AppLang } from "@/lib/app-i18n";

export type ProviderId = "mock" | "gigachat" | "openrouter" | "github-models" | "vercel-gateway";

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
    id: "gigachat",
    title: "GigaChat (Direct)",
    keyLabel: "GIGACHAT_AUTH_KEY",
    defaultModel: "GigaChat",
    note: {
      ru: "Прямой доступ к GigaChat через ваш личный Authorization Key. Требует base64(Client_ID:Client_Secret).",
      en: "Direct GigaChat access via your personal Authorization Key. Requires base64(Client_ID:Client_Secret)."
    },
    docsUrl: "https://developers.sber.ru/docs/ru/gigachat/api/reference/rest/gigachat-api"
  },
  {
    id: "openrouter",
    title: "OpenRouter",
    keyLabel: "OPENROUTER_API_KEY",
    defaultModel: "openrouter/free",
    note: {
      ru: "Основной провайдер. Через OpenRouter доступны GigaChat, OpenAI, Anthropic и другие модели.",
      en: "Primary provider. Access GigaChat, OpenAI, Anthropic and more through OpenRouter."
    },
    docsUrl: "https://openrouter.ai/docs/models"
  },
  {
    id: "github-models",
    title: "GitHub Models",
    keyLabel: "GITHUB_TOKEN",
    defaultModel: "openai/gpt-4o-mini",
    note: {
      ru: "Бесплатный доступ к моделям через GitHub. Требует GitHub token с правом read:models.",
      en: "Free access to models via GitHub. Requires GitHub token with read:models scope."
    },
    docsUrl: "https://docs.github.com/ru/github-models/use-github-models/prototyping-with-ai-models"
  },
  {
    id: "vercel-gateway",
    title: "Vercel AI Gateway",
    keyLabel: "AI_GATEWAY_API_KEY",
    defaultModel: "openai/gpt-oss-120b",
    note: {
      ru: "Вариант для Vercel-first инфраструктуры и управления несколькими провайдерами.",
      en: "Option for Vercel-first infrastructure and multi-provider routing."
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

import { getGigaChatAccessToken } from "@/lib/gigachat-token";
import { requestGigaChatJson } from "@/lib/gigachat-http";
import { app, providers } from "@/lib/config";
import { getProviderHttpError, isProviderTimeoutError } from "@/lib/provider-errors";
import type { AppLang } from "@/lib/app-i18n";
import type { ProviderId } from "@/lib/provider-registry";

export type TeacherConversationFacts = {
  context: string;
  completedStages: number;
  answers: number;
  scenarioA: number;
  scenarioB: number;
  clarifications: number;
  returns: number;
  retries: number;
  skips: number;
  hasFinalNote: boolean;
};

export type TeacherConversationResult = {
  summary: string;
  questions: string[];
  nextStep: string;
};

type CompletionPayload = { choices?: Array<{ message?: { content?: unknown } }> };

function getContent(payload: unknown, provider: string) {
  const content = (payload as CompletionPayload).choices?.[0]?.message?.content;
  if (typeof content === "string" && content.trim()) return content.trim();
  throw new Error(`${provider} returned no usable completion`);
}

function buildMessages(facts: TeacherConversationFacts, lang: AppLang) {
  const russian = lang !== "en";
  const system = [
    "You prepare a respectful teacher-student conversation from factual self-regulation session signals.",
    russian ? "Write every human-facing field in Russian." : "Write every human-facing field in English.",
    "Do not diagnose, assess wellbeing, infer causes, assess personality, label the learner, or give clinical advice.",
    "Do not repeat personal data and do not claim more than the provided process facts show.",
    "Return only strict JSON: {\"summary\":\"one factual sentence\",\"questions\":[\"up to three open questions\"],\"nextStep\":\"one calm, practical teacher action\"}.",
  ].join("\n");
  return [{ role: "system", content: system }, { role: "user", content: JSON.stringify(facts) }];
}

function normalizeLine(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maxLength) : "";
}

export function parseTeacherConversation(content: string): TeacherConversationResult {
  const candidate = content.match(/\{[\s\S]*\}/)?.[0] || content;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(candidate) as Record<string, unknown>;
  } catch {
    throw new Error("Provider returned an unusable conversation preparation");
  }

  const summary = normalizeLine(parsed.summary, 420);
  const nextStep = normalizeLine(parsed.nextStep, 300);
  const questions = Array.isArray(parsed.questions)
    ? parsed.questions.map((item) => normalizeLine(item, 260)).filter(Boolean).slice(0, 3)
    : [];
  if (!summary || !nextStep || questions.length === 0) {
    throw new Error("Provider returned an incomplete conversation preparation");
  }
  return { summary, questions, nextStep };
}

export async function generateTeacherConversation(params: {
  provider: ProviderId;
  model?: string;
  userApiKey: string;
  lang: AppLang;
  facts: TeacherConversationFacts;
}): Promise<TeacherConversationResult> {
  const { provider, model, userApiKey, lang, facts } = params;
  const messages = buildMessages(facts, lang);
  let payload: unknown;

  try {
    if (provider === "groq") {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${userApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: providers.groq.model(model), messages, temperature: 0.2, max_tokens: 400 }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) throw getProviderHttpError("Groq", response.status);
      payload = await response.json();
    } else if (provider === "openrouter") {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${userApiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": app.baseUrl(),
          "X-Title": "SelfReg AI",
        },
        body: JSON.stringify({ model: providers.openrouter.model(model), messages, temperature: 0.2, max_tokens: 400, reasoning: { effort: "low", exclude: true } }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) throw getProviderHttpError("OpenRouter", response.status);
      payload = await response.json();
    } else if (provider === "gigachat") {
      const accessToken = await getGigaChatAccessToken(userApiKey, providers.gigachat.scope(), providers.gigachat.authUrl());
      const response = await requestGigaChatJson<CompletionPayload>(providers.gigachat.apiUrl() || "https://api.giga.chat/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ model: providers.gigachat.model(model), messages, temperature: 0.2, max_tokens: 400 }),
        timeoutMs: 20_000,
      });
      if (!response.ok) throw getProviderHttpError("GigaChat", response.status);
      payload = response.data;
    } else {
      throw new Error("The selected provider is not available for conversation preparation");
    }
  } catch (error) {
    if (isProviderTimeoutError(error)) throw new Error("Provider request timed out after 20 seconds");
    throw error;
  }

  return parseTeacherConversation(getContent(payload, provider));
}

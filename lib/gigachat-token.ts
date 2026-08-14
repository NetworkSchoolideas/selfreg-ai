import { createHash, randomUUID } from "node:crypto";
import { requestGigaChatJson } from "@/lib/gigachat-http";
import { getProviderHttpError } from "@/lib/provider-errors";

type CachedToken = { token: string; expiresAt: number };

const tokenCache = new Map<string, CachedToken>();
const AUTH_URL = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth";
const CACHE_TTL_MS = 25 * 60 * 1000;

function cacheKey(authorizationKey: string) {
  return createHash("sha256").update(authorizationKey).digest("hex");
}

export async function getGigaChatAccessToken(
  authorizationKey: string,
  scope = "GIGACHAT_API_PERS",
  authUrl = AUTH_URL,
): Promise<string> {
  const key = cacheKey(authorizationKey);
  const cached = tokenCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const body = new URLSearchParams({ scope }).toString();
  const response = await requestGigaChatJson<{ access_token?: unknown; expires_at?: unknown }>(authUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authorizationKey}`,
      RqUID: randomUUID(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
    timeoutMs: 20_000,
  });

  if (!response.ok) throw getProviderHttpError("GigaChat OAuth", response.status);

  const data = response.data;
  if (typeof data.access_token !== "string" || !data.access_token) {
    throw new Error("GigaChat OAuth response missing access_token");
  }

  const providerExpiry = typeof data.expires_at === "number"
    ? (data.expires_at > 10_000_000_000 ? data.expires_at : data.expires_at * 1000) - 60_000
    : Date.now() + CACHE_TTL_MS;
  tokenCache.set(key, {
    token: data.access_token,
    expiresAt: Math.min(providerExpiry, Date.now() + CACHE_TTL_MS),
  });
  return data.access_token;
}

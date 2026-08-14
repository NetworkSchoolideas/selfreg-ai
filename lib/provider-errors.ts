export function getProviderHttpError(provider: string, status: number): Error {
  if (status === 401) return new Error(`${provider}: invalid or expired credentials (401)`);
  if (status === 402 || status === 403) return new Error(`${provider}: model access or quota is unavailable (${status})`);
  if (status === 404) return new Error(`${provider}: the selected model or endpoint was not found (404)`);
  if (status === 429) return new Error(`${provider}: free-tier rate limit reached (429)`);
  if (status >= 500) return new Error(`${provider}: provider service is temporarily unavailable (${status})`);
  return new Error(`${provider}: request failed (${status})`);
}

export function isProviderTimeoutError(error: unknown): boolean {
  return error instanceof Error && (
    error.name === "TimeoutError" ||
    error.name === "AbortError" ||
    /aborted due to timeout|timed out/i.test(error.message)
  );
}

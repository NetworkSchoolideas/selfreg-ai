export type AppLang = "ru" | "en";

export function normalizeAppLang(value?: string | null): AppLang {
  return value === "en" ? "en" : "ru";
}

export function withLang(path: string, lang: AppLang) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}lang=${lang}`;
}

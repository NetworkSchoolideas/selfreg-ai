import type { AppLang } from "@/lib/app-i18n";
import type { Session } from "@/types/session";

/**
 * Session answers are user-authored data. When the dashboard language differs,
 * they must not be machine-translated or mixed into the surrounding interface.
 */
export function hasSessionLanguageMismatch(session: Pick<Session, "lang">, dashboardLang: AppLang): boolean {
  return Boolean(session.lang && session.lang !== dashboardLang);
}

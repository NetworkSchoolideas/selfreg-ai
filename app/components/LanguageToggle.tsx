"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { normalizeAppLang, type AppLang } from "@/lib/app-i18n";

function buildHref(pathname: string, searchParams: URLSearchParams, lang: AppLang) {
  const params = new URLSearchParams(searchParams.toString());
  params.set("lang", lang);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function LanguageToggle() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeLang = normalizeAppLang(searchParams.get("lang"));

  return (
    <div className="action-row" style={{ gap: 8 }}>
      <Link className={`button ${activeLang === "ru" ? "" : "secondary"}`} href={buildHref(pathname, searchParams, "ru")}>
        RU
      </Link>
      <Link className={`button ${activeLang === "en" ? "" : "secondary"}`} href={buildHref(pathname, searchParams, "en")}>
        EN
      </Link>
    </div>
  );
}

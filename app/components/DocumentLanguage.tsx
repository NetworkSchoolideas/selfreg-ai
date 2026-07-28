"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { normalizeAppLang } from "@/lib/app-i18n";

/** Keeps the document language aligned with the app language query parameter after navigation. */
export function DocumentLanguage() {
  const searchParams = useSearchParams();
  const lang = normalizeAppLang(searchParams.get("lang"));

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return null;
}

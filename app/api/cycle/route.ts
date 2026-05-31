import { NextResponse } from "next/server";
import { getStageMeta, getStageOrder } from "@/lib/selfreg-model";
import { normalizeAppLang } from "@/lib/app-i18n";
import { serverError } from "@/lib/api-errors";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const lang = normalizeAppLang(url.searchParams.get("lang"));

    const stages = getStageOrder().map((id) => getStageMeta(id, lang));

    return NextResponse.json({
      stages,
      note:
        lang === "en"
          ? "This route returns the five stages of the self-regulation model used by the prototype."
          : "Маршрут возвращает пять этапов модели саморегуляции, которые использует прототип."
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load stages";
    return serverError(message, "INTERNAL_ERROR");
  }
}

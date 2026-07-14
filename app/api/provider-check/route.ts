import { NextResponse } from "next/server";
import { z } from "zod";
import { getAiProvider } from "@/lib/ai-provider";
import { normalizeAppLang } from "@/lib/app-i18n";
import { assertUserKeyPolicy, redactSecret } from "@/lib/key-security";
import { requireServerUserAccess } from "@/lib/server-user-access";
import { acquireRequestSlot } from "@/lib/request-rate-limit";
import { clientError, serverError } from "@/lib/api-errors";

const ProviderCheckRequest = z.object({
  provider: z.enum(["mock", "gigachat", "openrouter", "github-models", "vercel-gateway"]),
  model: z.string().optional(),
  userApiKey: z.string().optional(),
  lang: z.enum(["ru", "en"]).optional()
});

export async function POST(request: Request) {
  let releaseRequestSlot: (() => void) | undefined;

  try {
    const access = await requireServerUserAccess();
    if (access.response) return access.response;

    const slot = acquireRequestSlot(`provider-check:${access.context.userId}`, {
      windowMs: 60_000,
      maxRequests: 5,
      maxInFlight: 1,
    });
    if (!slot.allowed) return clientError("Please wait before checking the provider again", "RATE_LIMITED");
    releaseRequestSlot = slot.release;

    const body = ProviderCheckRequest.parse(await request.json());
    const lang = normalizeAppLang(body.lang);
    assertUserKeyPolicy(body.userApiKey);

    const provider = getAiProvider(body.provider);
    const result = await provider.analyze({
      userId: access.context.userId,
      answer:
        lang === "en"
          ? "I want to check that the provider connection works."
          : "Хочу проверить, что подключение провайдера работает.",
      currentStage: "1",
      provider: body.provider,
      model: body.model,
      userApiKey: body.userApiKey,
      lang,
      history: []
    });

    return NextResponse.json({
      ok: true,
      provider: body.provider,
      model: body.model || null,
      key: body.userApiKey ? redactSecret(body.userApiKey) : "server-env",
      sample: result.feedback,
      responseMode: result.responseMode || "mock"
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return clientError("Invalid request payload", "VALIDATION_ERROR");
    }

    const message = error instanceof Error ? error.message : "Provider check failed";

    return serverError(message, "PROVIDER_ERROR");
  } finally {
    releaseRequestSlot?.();
  }
}

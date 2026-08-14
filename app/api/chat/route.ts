import { NextResponse } from "next/server";
import { z } from "zod";
import { getAiProvider } from "@/lib/ai-provider";
import { normalizeAppLang } from "@/lib/app-i18n";
import { assertUserKeyPolicy } from "@/lib/key-security";
import { detectNonAcademicContext } from "@/lib/scenario-guards";
import { detectSafetyRisk } from "@/lib/safety-guard";
import { getNextStage, type StageId } from "@/lib/selfreg-model";
import { decideSupportScenarioDetailed } from "@/lib/scenario-engine";
import { requireServerUserAccess } from "@/lib/server-user-access";
import { acquireRequestSlot } from "@/lib/request-rate-limit";
import { clientError, serverError } from "@/lib/api-errors";

const ChatRequest = z.object({
  userId: z.string().min(1),
  answer: z.string().min(1),
  currentStage: z.string().min(1),
  context: z.string().optional(),
  provider: z.enum(["mock", "gigachat", "openrouter", "groq", "github-models", "vercel-gateway"]).optional(),
  model: z.string().optional(),
  userApiKey: z.string().optional(),
  lang: z.enum(["ru", "en"]).optional(),
  history: z
    .array(
      z.object({
        stage: z.string(),
        answer: z.string(),
        feedback: z.string().optional(),
        scenario: z.enum(["A", "B", "clarify", "skipped"]).optional(),
        eventType: z.enum(["answer", "clarify_request", "back", "skip"]).optional()
      })
    )
    .default([]),
  // forcedScenario has the highest priority: teacher/test/guard override.
  forcedScenario: z.enum(["A", "B", "clarify"]).optional()
});

export async function POST(request: Request) {
  let releaseRequestSlot: (() => void) | undefined;

  try {
    const access = await requireServerUserAccess();
    if (access.response) return access.response;

    const slot = acquireRequestSlot(`chat:${access.context.userId}`, {
      windowMs: 60_000,
      maxRequests: 12,
      maxInFlight: 1,
    });
    if (!slot.allowed) return clientError("Please wait before sending another request", "RATE_LIMITED");
    releaseRequestSlot = slot.release;

    const body = ChatRequest.parse(await request.json());
    const lang = normalizeAppLang(body.lang);
    assertUserKeyPolicy(body.userApiKey);

    const safety = detectSafetyRisk({
      answer: body.answer,
      context: body.context,
      history: body.history,
      lang,
    });
    if (safety) {
      return NextResponse.json({
        scenario: "clarify",
        feedback: safety.message,
        finalNote: "",
        responseMode: "mock",
        safety,
      });
    }

    const currentStage = body.currentStage as StageId;

    const engineDecision = decideSupportScenarioDetailed(
      body.answer,
      body.context,
      body.history || [],
      lang,
      body.forcedScenario,
      currentStage
    );

    const finalScenario = engineDecision.scenario;
    const nonAcademic = detectNonAcademicContext(body.context || body.answer);
    const provider = getAiProvider(body.provider);
    const result = await provider.analyze({
      ...body,
      userId: access.context.userId,
      lang,
      currentStage,
      nonAcademicContext: nonAcademic.detected,
      forcedScenario: finalScenario
    });

    if (body.provider && body.provider !== "mock" && result.responseMode === "llm-fallback") {
      return serverError(
        lang === "en"
          ? "The provider returned an unusable response. Your answer was not advanced; retry or choose another provider."
          : "Провайдер вернул непригодный ответ. Этап и ответ сохранены; повторите запрос или выберите другого провайдера.",
        "PROVIDER_UNUSABLE_RESPONSE",
      );
    }

    return NextResponse.json({
      ...result,
      nextStage: getNextStage(currentStage),
      scenario: finalScenario
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return clientError("Invalid request payload", "VALIDATION_ERROR");
    }

    const message = error instanceof Error ? error.message : "Internal server error";

    if (message.includes("API") || message.includes("provider") || message.includes("OpenRouter") || message.includes("GigaChat") || message.includes("Groq")) {
      return serverError(message, "PROVIDER_ERROR");
    }

    return clientError(message);
  } finally {
    releaseRequestSlot?.();
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { getAiProvider } from "@/lib/ai-provider";
import { normalizeAppLang } from "@/lib/app-i18n";
import { assertUserKeyPolicy } from "@/lib/key-security";
import { detectClarificationNeed, detectNonAcademicContext } from "@/lib/scenario-guards";
import { getNextStage, type StageId } from "@/lib/selfreg-model";
import { decideSupportScenarioDetailed } from "@/lib/scenario-engine";
import { clientError, serverError } from "@/lib/api-errors";

const ChatRequest = z.object({
  userId: z.string().min(1),
  answer: z.string().min(1),
  currentStage: z.string().min(1),
  context: z.string().optional(),
  provider: z.enum(["mock", "gigachat", "openrouter", "github-models", "vercel-gateway"]).optional(),
  model: z.string().optional(),
  userApiKey: z.string().optional(),
  lang: z.enum(["ru", "en"]).optional(),
  history: z
    .array(
      z.object({
        stage: z.string(),
        answer: z.string(),
        feedback: z.string().optional()
      })
    )
    .default([]),
  /** forcedScenario — высший приоритет (учитель / тесты / guard). Переопределяет все эвристики. */
  forcedScenario: z.enum(["A", "B", "clarify"]).optional()
});

export async function POST(request: Request) {
  try {
    const body = ChatRequest.parse(await request.json());
    const lang = normalizeAppLang(body.lang);
    assertUserKeyPolicy(body.userApiKey);

    // NOTE (final pre-publication):
    // The early clarify guard has been removed as a hard gate.
    // All scenario decisions (including clarify) now go through the tuned engine in scenario-engine.ts.
    // This prevents honest but short/uncertain answers on middle stages (Feedback, Comparison)
    // from forcing unwanted clarify chains and stage skipping.
    // The engine is strict, B-first, and only recommends clarify on genuinely unclear input.

    const currentStage = body.currentStage as StageId;

    /**
     * Здесь бэкенд принимает финальное решение о сценарии.
     * 
     * - `body.forcedScenario` (если передан клиентом) — это override от учителя/тестов.
     * - `decideSupportScenarioDetailed` — это основная эвристика движка (non-linear, с учётом истории).
     * 
     * С этого момента `finalScenario` — единственный источник истины.
     * LLM в провайдерах не имеет права его менять.
     */
    const engineDecision = decideSupportScenarioDetailed(
      body.answer,
      body.context,
      body.history || [],
      lang,
      body.forcedScenario
    );

    const finalScenario = engineDecision.scenario;

    const nonAcademic = detectNonAcademicContext(body.context || body.answer);
    const provider = getAiProvider(body.provider);
    const result = await provider.analyze({
      ...body,
      lang,
      currentStage,
      nonAcademicContext: nonAcademic.detected,
      forcedScenario: finalScenario
    });

    return NextResponse.json({
      ...result,
      nextStage: getNextStage(currentStage),
      scenario: finalScenario
      // Примечание: engineDecision.reason и signals можно логировать или отдавать в будущем для дашборда
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return clientError("Invalid request payload", "VALIDATION_ERROR");
    }

    const message = error instanceof Error ? error.message : "Internal server error";

    // Provider errors or unexpected issues → 500
    if (message.includes("API") || message.includes("provider")) {
      return serverError(message, "PROVIDER_ERROR");
    }

    return clientError(message);
  }
}

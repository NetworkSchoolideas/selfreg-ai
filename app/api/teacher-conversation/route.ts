import { NextResponse } from "next/server";
import { z } from "zod";
import { assertUserKeyPolicy } from "@/lib/key-security";
import { clientError, serverError } from "@/lib/api-errors";
import { getSessionSignals } from "@/lib/teacher-dashboard-analytics";
import { fetchChildrenFromSupabase } from "@/lib/server-storage";
import { requireTeacherAccess } from "@/lib/server-teacher-access";
import { inferRecordEventType, isProgressRecord } from "@/lib/session-helpers";
import { generateTeacherConversation } from "@/lib/teacher-conversation";
import { isProviderEnabledInRelease } from "@/lib/provider-registry";
import { acquireRequestSlot } from "@/lib/request-rate-limit";

const TeacherConversationRequest = z.object({
  childId: z.string().uuid(),
  sessionUpdatedAt: z.string().datetime(),
  provider: z.enum(["gigachat", "openrouter", "groq"]),
  model: z.string().min(1).max(120).optional(),
  userApiKey: z.string().min(1),
  lang: z.enum(["ru", "en"]),
});

export async function POST(request: Request) {
  let release: (() => void) | undefined;
  try {
    const access = await requireTeacherAccess();
    if (access.response) return access.response;
    const body = TeacherConversationRequest.parse(await request.json());
    if (!isProviderEnabledInRelease(body.provider)) return clientError("Provider is unavailable", "PROVIDER_UNAVAILABLE");
    assertUserKeyPolicy(body.userApiKey);

    const slot = acquireRequestSlot(`teacher-conversation:${access.teacherId}`, { windowMs: 60_000, maxRequests: 4, maxInFlight: 1 });
    if (!slot.allowed) return clientError("Please wait before preparing another conversation", "RATE_LIMITED");
    release = slot.release;

    const children = await fetchChildrenFromSupabase(access.teacherId!);
    const child = children.find((item) => item.id === body.childId);
    const session = child?.sessions.find((item) => item.updatedAt === body.sessionUpdatedAt);
    if (!session) return clientError("Selected session is not available in this teacher dashboard", "SESSION_NOT_FOUND");
    if (session.status !== "completed" && !session.finalNote?.trim()) {
      return clientError("Only completed sessions can be used for conversation preparation", "SESSION_NOT_COMPLETED");
    }
    if (session.lang && session.lang !== body.lang) {
      return clientError("Open the dashboard in the session language before preparing a conversation", "SESSION_LANGUAGE_MISMATCH");
    }

    const signals = getSessionSignals(session.records);
    const answerRecords = session.records.filter((record) => inferRecordEventType(record) === "answer");
    const result = await generateTeacherConversation({
      provider: body.provider,
      model: body.model,
      userApiKey: body.userApiKey,
      lang: body.lang,
      facts: {
        context: session.context,
        completedStages: new Set(session.records.filter(isProgressRecord).map((record) => record.stageId)).size,
        answers: answerRecords.length,
        scenarioA: answerRecords.filter((record) => record.scenario === "A").length,
        scenarioB: answerRecords.filter((record) => record.scenario === "B").length,
        clarifications: signals.clarifications,
        returns: signals.returns,
        retries: signals.retries,
        skips: signals.skips,
        hasFinalNote: Boolean(session.finalNote?.trim()),
      },
    });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    if (error instanceof z.ZodError) return clientError("Invalid conversation preparation request", "VALIDATION_ERROR");
    const message = error instanceof Error ? error.message : "Could not prepare conversation";
    return serverError(message, "PROVIDER_ERROR");
  } finally {
    release?.();
  }
}

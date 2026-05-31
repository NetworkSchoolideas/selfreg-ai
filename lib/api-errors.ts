/**
 * Pragmatic API error handling utilities.
 *
 * Goal: Consistent error shape + easy place to add logging / observability later.
 */

import { NextResponse } from "next/server";

export type ApiErrorResponse = {
  error: string;
  code?: string;
};

function logError(message: string, code?: string, status?: number) {
  // Lightweight observability hook.
  // In production you can forward this to your logging platform (Sentry, Axiom, etc.).
  const isProd = process.env.NODE_ENV === "production";

  if (!isProd) {
    console.warn(`[API Error] status=${status ?? "unknown"} code=${code ?? "none"} → ${message}`);
  } else {
    // In production we still want some signal (Vercel will capture console.error)
    console.error(`[SelfReg] API error [${code ?? "unknown"}]: ${message}`);
  }
}

export function createErrorResponse(
  message: string | Error,
  status: number = 400,
  code?: string
): NextResponse<ApiErrorResponse> {
  const errorMessage = message instanceof Error ? message.message : message;

  logError(errorMessage, code, status);

  return NextResponse.json(
    {
      error: errorMessage,
      ...(code && { code }),
    },
    { status }
  );
}

/**
 * Helper for validation / client errors (400)
 */
export function clientError(message: string, code?: string) {
  return createErrorResponse(message, 400, code);
}

/**
 * Helper for server / provider errors (500)
 */
export function serverError(message: string, code?: string) {
  return createErrorResponse(message, 500, code);
}

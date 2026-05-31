import { NextResponse } from "next/server";

/**
 * Simple health-check endpoint.
 * Useful for uptime monitoring, load balancers, and deployment verification.
 */
export async function GET() {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "selfreg-ai",
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local",
  };

  return NextResponse.json(health, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

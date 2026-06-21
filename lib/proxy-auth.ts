export function isPrototypeDashboardRoute(pathname: string): boolean {
  return pathname.startsWith("/teacher") || pathname.startsWith("/student");
}

interface DevAuthBypassOptions {
  pathname: string;
  hasSession: boolean;
  nodeEnv?: string;
}

export function shouldBypassAuthForLocalDev({
  pathname,
  hasSession,
  nodeEnv,
}: DevAuthBypassOptions): boolean {
  if (hasSession) {
    return false;
  }

  if (nodeEnv === "production") {
    return false;
  }

  return isPrototypeDashboardRoute(pathname);
}

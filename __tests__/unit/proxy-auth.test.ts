import {
  isPrototypeDashboardRoute,
  shouldBypassAuthForLocalDev,
} from "@/lib/proxy-auth";

describe("proxy auth helpers", () => {
  it("recognizes prototype dashboard routes", () => {
    expect(isPrototypeDashboardRoute("/teacher")).toBe(true);
    expect(isPrototypeDashboardRoute("/teacher/dashboard/child")).toBe(true);
    expect(isPrototypeDashboardRoute("/student/dashboard")).toBe(true);
    expect(isPrototypeDashboardRoute("/auth/login")).toBe(false);
  });

  it("allows local development bypass only for unauthenticated prototype routes", () => {
    expect(
      shouldBypassAuthForLocalDev({
        pathname: "/teacher",
        hasSession: false,
        nodeEnv: "development",
      })
    ).toBe(true);

    expect(
      shouldBypassAuthForLocalDev({
        pathname: "/student/dashboard",
        hasSession: false,
        nodeEnv: "test",
      })
    ).toBe(true);

    expect(
      shouldBypassAuthForLocalDev({
        pathname: "/auth/login",
        hasSession: false,
        nodeEnv: "development",
      })
    ).toBe(false);

    expect(
      shouldBypassAuthForLocalDev({
        pathname: "/teacher",
        hasSession: true,
        nodeEnv: "development",
      })
    ).toBe(false);

    expect(
      shouldBypassAuthForLocalDev({
        pathname: "/teacher",
        hasSession: false,
        nodeEnv: "production",
      })
    ).toBe(false);
  });
});

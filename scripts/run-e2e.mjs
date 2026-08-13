import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

// Use IPv4 loopback by default: on Windows, `localhost` can resolve to IPv6
// while the dev server is only listening on IPv4, causing fixture setup to
// fail before a browser scenario begins.
const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3001";
const baseUrlDetails = new URL(baseUrl);
const devHost = baseUrlDetails.hostname || "localhost";
const devPort = baseUrlDetails.port || "3000";
const devCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const devArgs = ["run", "dev", "--", "--hostname", devHost, "--port", devPort];
const playwrightCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const playwrightArgs = ["playwright", "test", ...process.argv.slice(2)];

function quoteShellArg(value) {
  if (/^[A-Za-z0-9_./:=@-]+$/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '\\"')}"`;
}

export function createSpawnInvocation(command, args, platform = process.platform) {
  if (platform === "win32") {
    return {
      command: [command, ...args].map(quoteShellArg).join(" "),
      args: [],
      shell: true,
    };
  }

  return {
    command,
    args,
    shell: false,
  };
}

async function isServerReady() {
  try {
    const response = await fetch(baseUrl, { redirect: "manual" });
    return response.status > 0;
  } catch {
    return false;
  }
}

async function waitForServer(timeoutMs = 120_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isServerReady()) {
      return;
    }

    await delay(1_000);
  }

  throw new Error(`Dev server did not become ready within ${timeoutMs}ms: ${baseUrl}`);
}

function spawnProcess(command, args, options = {}) {
  const invocation = createSpawnInvocation(command, args);

  return spawn(invocation.command, invocation.args, {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: invocation.shell,
    ...options,
  });
}

async function stopProcessTree(child) {
  if (!child || child.exitCode !== null) {
    return;
  }

  if (process.platform === "win32") {
    await new Promise((resolve) => {
      const killer = spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
        stdio: "ignore",
        shell: false,
      });

      killer.on("error", resolve);
      killer.on("exit", resolve);
    });
    return;
  }

  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    delay(10_000).then(() => child.kill("SIGKILL")),
  ]);
}

async function runPlaywright() {
  const testProcess = spawnProcess(playwrightCommand, playwrightArgs, {
    // The remote E2E fixture provisions and confirms Supabase Auth users.
    // Keep the standard command serial so local runs do not overload it.
    env: {
      ...process.env,
      CI: process.env.CI || "1",
    },
  });

  return await new Promise((resolve) => {
    testProcess.on("exit", (code, signal) => {
      if (signal) {
        resolve(1);
        return;
      }

      resolve(code ?? 1);
    });
  });
}

async function main() {
  let devServer = null;
  let isStoppingDevServer = false;
  let exitCode = 1;

  try {
    if (!(await isServerReady())) {
      devServer = spawnProcess(devCommand, devArgs, {
        env: {
          ...process.env,
          BROWSER: "none",
          SELFREG_NEXT_DIST_DIR: process.env.SELFREG_NEXT_DIST_DIR || ".next-e2e",
          SELFREG_E2E_TEACHER_ACCESS_BYPASS: "1",
          SELFREG_E2E_ENABLED: process.env.SELFREG_E2E_ENABLED || "1",
          SELFREG_E2E_SECRET: process.env.SELFREG_E2E_SECRET || "local-e2e-secret",
        },
      });

      devServer.on("exit", (code) => {
        if (!isStoppingDevServer && code && code !== 0) {
          console.error(`Dev server exited early with code ${code}`);
        }
      });

      await waitForServer();
    }

    exitCode = await runPlaywright();
  } finally {
    isStoppingDevServer = true;
    await stopProcessTree(devServer);
  }

  process.exit(exitCode);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

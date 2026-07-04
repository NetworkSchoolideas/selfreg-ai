import { execFileSync } from "node:child_process";

describe("E2E runner process invocation", () => {
  it("builds a Windows shell command without passing args separately", () => {
    const output = execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        [
          "import { createSpawnInvocation } from './scripts/run-e2e.mjs';",
          "const result = createSpawnInvocation('npm.cmd', ['run', 'dev', '--', '--port', '3000'], 'win32');",
          "console.log(JSON.stringify(result));",
        ].join(""),
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
      }
    );

    expect(JSON.parse(output)).toEqual({
      command: 'npm.cmd run dev -- --port 3000',
      args: [],
      shell: true,
    });
  });

  it("keeps POSIX command and args separate", () => {
    const output = execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        [
          "import { createSpawnInvocation } from './scripts/run-e2e.mjs';",
          "const result = createSpawnInvocation('npm', ['run', 'dev'], 'linux');",
          "console.log(JSON.stringify(result));",
        ].join(""),
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
      }
    );

    expect(JSON.parse(output)).toEqual({
      command: "npm",
      args: ["run", "dev"],
      shell: false,
    });
  });
});

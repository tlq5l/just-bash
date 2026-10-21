/**
 * The CJS entry point has no runtime coverage: the suite runs against the
 * source tree, so anything that only breaks under `--format=cjs` ships
 * unnoticed. This loads `dist/bundle/index.cjs` in a child process, the way a
 * `require("just-bash")` consumer does.
 */

import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const bundlePath = resolve(__dirname, "../dist/bundle/index.cjs");

async function runInCjs(
  command: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const script = `
    const { Bash } = require(${JSON.stringify(bundlePath)});
    new Bash().exec(${JSON.stringify(command)}).then((result) => {
      process.stdout.write(JSON.stringify(result));
    });
  `;
  const { stdout } = await execFileAsync("node", ["-e", script], {
    maxBuffer: 10 * 1024 * 1024,
  });
  return JSON.parse(stdout);
}

describe("published CommonJS export", () => {
  it("runs sqlite3 — the worker path must resolve without import.meta", async () => {
    const result = await runInCjs('sqlite3 :memory: "SELECT 1 + 1;"');

    expect(result.stderr).toBe("");
    expect(result.stdout).toBe("2\n");
    expect(result.exitCode).toBe(0);
  }, 60_000);
});

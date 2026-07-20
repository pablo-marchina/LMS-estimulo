import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const command = process.env.GITLEAKS_BIN || "gitleaks";
const workspace = await mkdtemp(join(tmpdir(), "estimulo-gitleaks-"));

function run(target, exitCode) {
  return spawnSync(
    command,
    ["dir", "--no-banner", "--redact", "--exit-code", String(exitCode), target],
    { encoding: "utf8" },
  );
}

try {
  const cleanPath = join(workspace, "clean.txt");
  const leakPath = join(workspace, "synthetic-leak.txt");

  await writeFile(cleanPath, "synthetic fixture without credentials\n", "utf8");

  // Construct the fake token at runtime so the test source itself is not a finding.
  const syntheticToken = ["ghp", "_", "A".repeat(36)].join("");
  await writeFile(leakPath, `GITHUB_TOKEN=${syntheticToken}\n`, "utf8");

  const clean = run(cleanPath, 17);
  assert.equal(
    clean.status,
    0,
    `clean fixture must pass; status=${clean.status}; stderr=${clean.stderr}`,
  );

  const detected = run(leakPath, 17);
  assert.equal(
    detected.status,
    17,
    `synthetic leak must fail closed; status=${detected.status}; stderr=${detected.stderr}`,
  );

  assert.equal(
    detected.stdout.includes(syntheticToken) || detected.stderr.includes(syntheticToken),
    false,
    "scanner output must redact the synthetic token",
  );

  console.log(JSON.stringify({ status: "PASS", clean_exit: 0, leak_exit: 17 }));
} finally {
  await rm(workspace, { recursive: true, force: true });
}

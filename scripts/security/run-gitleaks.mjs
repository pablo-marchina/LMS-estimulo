import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const command = process.env.GITLEAKS_BIN || "gitleaks";
const workspace = await mkdtemp(join(tmpdir(), "estimulo-gitleaks-report-"));
const reportPath = join(workspace, "findings.json");

try {
  const result = spawnSync(
    command,
    [
      "git",
      "--no-banner",
      "--redact",
      "--max-decode-depth=2",
      "--max-archive-depth=1",
      "--report-format=json",
      `--report-path=${reportPath}`,
    ],
    { encoding: "utf8" },
  );

  if (result.error) {
    console.error(`Gitleaks could not start: ${result.error.message}`);
    process.exitCode = 2;
  } else if (result.status === 0) {
    console.log(JSON.stringify({ status: "PASS", findings: 0 }));
  } else {
    let findings = [];

    try {
      findings = JSON.parse(await readFile(reportPath, "utf8"));
    } catch {
      console.error("Gitleaks failed without a readable redacted report.");
      if (result.stderr) console.error(result.stderr.trim());
      process.exitCode = result.status || 2;
      return;
    }

    const safeFindings = findings.map((finding) => ({
      rule: finding.RuleID || "unknown",
      file: finding.File || "unknown",
      line: finding.StartLine || finding.Line || null,
      commit: finding.Commit || null,
    }));

    console.error(
      JSON.stringify(
        { status: "LEAKS_FOUND", count: safeFindings.length, findings: safeFindings },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  }
} finally {
  await rm(workspace, { recursive: true, force: true });
}

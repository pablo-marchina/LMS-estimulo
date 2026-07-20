import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const command = process.env.GITLEAKS_BIN || "gitleaks";
const workspace = await mkdtemp(join(tmpdir(), "estimulo-gitleaks-report-"));
const reportPath = join(workspace, "findings.json");
const artifactDirectory = join(process.cwd(), ".artifacts");
const safeReportPath = join(artifactDirectory, "gitleaks-safe.json");

async function persistSafeReport(report) {
  await mkdir(artifactDirectory, { recursive: true });
  await writeFile(safeReportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function redactContext(line) {
  if (!line) return null;

  return line
    .replace(/(["'`])(?:\\.|(?!\1).)*\1/g, "$1[REDACTED]$1")
    .replace(/[A-Za-z0-9+/_=.-]{12,}/g, "[REDACTED]")
    .slice(0, 240);
}

function readRedactedHistoricalContext(finding) {
  if (!finding.Commit || !finding.File || !finding.StartLine) return null;

  const historical = spawnSync(
    "git",
    ["show", `${finding.Commit}:${finding.File}`],
    { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 },
  );

  if (historical.status !== 0 || !historical.stdout) return null;
  const lines = historical.stdout.split(/\r?\n/u);
  const start = Math.max(0, finding.StartLine - 3);
  const end = Math.min(lines.length, finding.StartLine + 2);
  return lines.slice(start, end).map((line, index) => ({
    line: start + index + 1,
    text: redactContext(line),
  }));
}

async function main() {
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
      const safeReport = { status: "TOOL_ERROR", findings: 0, error: result.error.message };
      await persistSafeReport(safeReport);
      console.error(JSON.stringify(safeReport));
      return 2;
    }

    if (result.status === 0) {
      const safeReport = { status: "PASS", findings: 0 };
      await persistSafeReport(safeReport);
      console.log(JSON.stringify(safeReport));
      return 0;
    }

    let findings;
    try {
      findings = JSON.parse(await readFile(reportPath, "utf8"));
    } catch {
      const safeReport = {
        status: "REPORT_ERROR",
        findings: 0,
        exitCode: result.status || 2,
      };
      await persistSafeReport(safeReport);
      console.error(JSON.stringify(safeReport));
      return result.status || 2;
    }

    const safeFindings = findings.map((finding) => ({
      rule: finding.RuleID || "unknown",
      file: finding.File || "unknown",
      line: finding.StartLine || finding.Line || null,
      commit: finding.Commit || null,
      fingerprint: finding.Fingerprint || null,
      redactedContextWindow: readRedactedHistoricalContext(finding),
    }));
    const safeReport = {
      status: "LEAKS_FOUND",
      count: safeFindings.length,
      findings: safeFindings,
    };

    await persistSafeReport(safeReport);
    console.error(JSON.stringify(safeReport, null, 2));
    return 1;
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

process.exitCode = await main();

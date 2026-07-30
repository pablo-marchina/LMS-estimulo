import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const sourceExtensions = new Set([".js", ".mjs", ".cjs", ".ts", ".tsx", ".json", ".yml", ".yaml", ".sql"]);
const sourceRoots = [
  "apps/",
  "config/",
  "scripts/",
  "supabase/functions/",
  ".github/workflows/",
];
const explicitFiles = new Set(["package.json", "package-lock.json", "tsconfig.json"]);

function trackedFiles() {
  const output = execFileSync("git", ["ls-files", "-z"], { cwd: root });
  return output
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .filter((file) => explicitFiles.has(file) || sourceRoots.some((prefix) => file.startsWith(prefix)))
    .filter((file) => sourceExtensions.has(path.extname(file)));
}

const errors = [];
const files = trackedFiles();
for (const relativePath of files) {
  const buffer = await readFile(path.join(root, relativePath));
  if (buffer.includes(0)) {
    errors.push(`${relativePath}: NUL byte is forbidden in source files`);
    continue;
  }

  const text = buffer.toString("utf8");
  if (text.includes("\r\n")) errors.push(`${relativePath}: CRLF is forbidden; repository source uses LF`);
  if (/^(<<<<<<< |=======|>>>>>>> )/mu.test(text)) {
    errors.push(`${relativePath}: unresolved merge-conflict marker`);
  }

  if (path.extname(relativePath) === ".json") {
    try {
      JSON.parse(text);
    } catch (error) {
      errors.push(`${relativePath}: invalid JSON (${error instanceof Error ? error.message : "parse failure"})`);
    }
  }

  if (/\beval\s*\(/u.test(text) || /\bnew\s+Function\s*\(/u.test(text)) {
    errors.push(`${relativePath}: dynamic code execution is forbidden`);
  }
}

const report = {
  status: errors.length === 0 ? "passed" : "failed",
  files_checked: files.length,
  errors,
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (errors.length > 0) process.exitCode = 1;

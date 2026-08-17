import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await sourceFiles(fullPath));
    } else if (/\.[cm]?[jt]sx?$/u.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

test("application source never embeds a Next app page component inside another screen", async () => {
  const files = await sourceFiles("apps/web");
  const violations = [];
  const appPageImport = /from\s+["']@\/app\/[^"']+\/page["']/gu;

  for (const file of files) {
    const source = await readFile(file, "utf8");
    const matches = [...source.matchAll(appPageImport)].map((match) => match[0]);
    if (matches.length) violations.push(`${file}: ${matches.join(", ")}`);
  }

  assert.deepEqual(
    violations,
    [],
    `Do not compose route page modules inside other screens. Extract shared UI into a component instead:\n${violations.join("\n")}`,
  );
});

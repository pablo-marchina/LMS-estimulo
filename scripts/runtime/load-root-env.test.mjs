import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { loadRepositoryEnvironment } from "./load-root-env.mjs";

const injectedName = "ESTIMULO_ENV_TEST_INJECTED";
const fileOnlyName = "ESTIMULO_ENV_TEST_FILE_ONLY";

function restoreEnvironment(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

test("loads root env values without replacing injected deployment variables", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "estimulo-env-"));
  const envPath = join(directory, ".env");
  const previousInjected = process.env[injectedName];
  const previousFileOnly = process.env[fileOnlyName];

  context.after(async () => {
    restoreEnvironment(injectedName, previousInjected);
    restoreEnvironment(fileOnlyName, previousFileOnly);
    await rm(directory, { recursive: true, force: true });
  });

  process.env[injectedName] = "deployment-value";
  delete process.env[fileOnlyName];
  await writeFile(
    envPath,
    `${injectedName}=local-value\n${fileOnlyName}=loaded-from-file\n`,
    "utf8",
  );

  assert.equal(loadRepositoryEnvironment(envPath), true);
  assert.equal(process.env[injectedName], "deployment-value");
  assert.equal(process.env[fileOnlyName], "loaded-from-file");
});

test("does nothing when the root env file does not exist", () => {
  assert.equal(
    loadRepositoryEnvironment(join(tmpdir(), "estimulo-missing-env-file")),
    false,
  );
});

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(currentDir, "../../..");
const migrationsDir = resolve(repositoryRoot, "supabase/migrations");
const defaultManifestPath = resolve(
  repositoryRoot,
  "docs/implementation/opaque-helper-baseline-v1.json"
);

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function splitArguments(argumentList) {
  if (argumentList.trim().length === 0) return [];
  return argumentList.split(",").map((argument) => normalizeWhitespace(argument));
}

function parseArgument(argument) {
  const withoutDefault = argument.replace(/\s+default\s+[\s\S]*$/i, "").trim();
  const parts = withoutDefault.split(/\s+/);
  const name = parts.shift() ?? "";
  const type = parts.join(" ").replace(/\s*=.*$/, "").trim();
  return { name, type };
}

function parseDropArgument(argument) {
  return { name: "", type: normalizeWhitespace(argument) };
}

function functionKey(schema, name, arguments_) {
  return `${schema}.${name}(${arguments_.map((argument) => argument.type).join(",")})`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseE14Functions(sql, sourcePath) {
  const operations = [];
  const createPattern = /create\s+or\s+replace\s+function\s+(app_private|public)\.(e14_[a-z0-9_]+)\s*\(([\s\S]*?)\)\s*returns\b[\s\S]*?\bas\s+\$\$([\s\S]*?)\$\$\s*;/gi;
  const dropPattern = /drop\s+function\s+(?:if\s+exists\s+)?(app_private|public)\.(e14_[a-z0-9_]+)\s*\(([^;()]*)\)\s*;/gi;
  let match;

  while ((match = createPattern.exec(sql)) !== null) {
    const schema = match[1].toLowerCase();
    const name = match[2].toLowerCase();
    const arguments_ = splitArguments(match[3]).map(parseArgument);
    operations.push({
      operation: "create",
      position: match.index,
      schema,
      name,
      arguments: arguments_,
      body: match[4],
      sourcePath,
      key: functionKey(schema, name, arguments_)
    });
  }

  while ((match = dropPattern.exec(sql)) !== null) {
    const schema = match[1].toLowerCase();
    const name = match[2].toLowerCase();
    const arguments_ = splitArguments(match[3]).map(parseDropArgument);
    operations.push({
      operation: "drop",
      position: match.index,
      schema,
      name,
      arguments: arguments_,
      sourcePath,
      key: functionKey(schema, name, arguments_)
    });
  }

  return operations.sort((left, right) => left.position - right.position);
}

export function buildOpaqueInventory(operations) {
  const finalDefinitions = new Map();
  for (const operation of operations) {
    if (operation.operation === "drop") finalDefinitions.delete(operation.key);
    else finalDefinitions.set(operation.key, operation);
  }
  const finalFunctions = [...finalDefinitions.values()].sort((left, right) =>
    left.key.localeCompare(right.key)
  );

  const opaqueFunctions = finalFunctions.filter((function_) =>
    function_.arguments.some((argument) => /^[a-z]$/.test(argument.name))
  );

  const entries = opaqueFunctions.map((function_) => {
    const fullName = `${function_.schema}.${function_.name}`;
    const callPattern = new RegExp(`${escapeRegExp(fullName)}\\s*\\(`, "i");
    const consumers = finalFunctions
      .filter((candidate) => candidate.key !== function_.key && callPattern.test(candidate.body))
      .map((candidate) => candidate.key)
      .sort();

    return {
      key: function_.key,
      schema: function_.schema,
      name: function_.name,
      argument_names: function_.arguments.map((argument) => argument.name),
      argument_types: function_.arguments.map((argument) => argument.type),
      definition_path: function_.sourcePath,
      consumers
    };
  });

  const publicRpcs = entries.filter((entry) => entry.schema === "public");
  const privateHelpers = entries.filter((entry) => entry.schema === "app_private");
  const digestPayload = JSON.stringify(entries);

  return {
    schema_version: "1.0",
    artifact: "opaque_helper_baseline",
    detection_rule: "final E14 function definitions with one-letter argument names",
    migration_source: "supabase/migrations",
    legacy_function_count: entries.length,
    legacy_private_helper_count: privateHelpers.length,
    legacy_public_rpc_count: publicRpcs.length,
    inventory_sha256: createHash("sha256").update(digestPayload).digest("hex"),
    functions: entries
  };
}

export function inventoryRepository() {
  const files = readdirSync(migrationsDir)
    .filter((filename) => filename.endsWith(".sql"))
    .sort();
  const operations = files.flatMap((filename) => {
    const absolutePath = resolve(migrationsDir, filename);
    const sourcePath = relative(repositoryRoot, absolutePath).replaceAll("\\", "/");
    return parseE14Functions(readFileSync(absolutePath, "utf8"), sourcePath);
  });
  return buildOpaqueInventory(operations);
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function describeInventoryDelta(expected, actual) {
  const expectedByKey = new Map(expected.functions.map((entry) => [entry.key, entry]));
  const actualByKey = new Map(actual.functions.map((entry) => [entry.key, entry]));
  return {
    added: [...actualByKey.entries()]
      .filter(([key]) => !expectedByKey.has(key))
      .map(([, entry]) => entry),
    removed: [...expectedByKey.entries()]
      .filter(([key]) => !actualByKey.has(key))
      .map(([, entry]) => entry),
    changed: [...actualByKey.entries()]
      .filter(([key, entry]) => expectedByKey.has(key) && stableJson(expectedByKey.get(key)) !== stableJson(entry))
      .map(([key, entry]) => ({ expected: expectedByKey.get(key), actual: entry })),
  };
}

function main() {
  const args = process.argv.slice(2);
  const writeIndex = args.indexOf("--write");
  const print = args.includes("--print");
  const manifestPath = writeIndex >= 0 && args[writeIndex + 1]
    ? resolve(repositoryRoot, args[writeIndex + 1])
    : defaultManifestPath;
  const inventory = inventoryRepository();

  if (writeIndex >= 0) {
    writeFileSync(manifestPath, stableJson(inventory));
    console.log(`Wrote ${relative(repositoryRoot, manifestPath)} with ${inventory.legacy_function_count} legacy functions.`);
    return;
  }

  if (print) {
    process.stdout.write(stableJson(inventory));
    return;
  }

  const expected = JSON.parse(readFileSync(manifestPath, "utf8"));
  const actualJson = stableJson(inventory);
  const expectedJson = stableJson(expected);
  if (actualJson !== expectedJson) {
    console.error("Opaque E14 helper inventory changed.");
    console.error(`Expected ${expected.legacy_function_count} legacy functions; found ${inventory.legacy_function_count}.`);
    console.error(stableJson(describeInventoryDelta(expected, inventory)).trim());
    console.error("Update the baseline only as part of an explicit semantic replacement or removal.");
    process.exit(1);
  }

  console.log(
    `Opaque helper containment passed: ${inventory.legacy_private_helper_count} private helpers and ${inventory.legacy_public_rpc_count} public RPCs remain frozen.`
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();

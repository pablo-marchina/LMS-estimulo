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
const semanticReplacementsPath = resolve(
  repositoryRoot,
  "docs/implementation/opaque-helper-semantic-replacements-v1.json"
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

export function describeInventoryDelta(expected, actual) {
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

export function validateApprovedSemanticReplacements(expected, actual, document) {
  if (document?.schema_version !== "1.0" || document?.artifact !== "opaque_helper_semantic_replacements") {
    throw new Error("semantic replacement ledger metadata is invalid");
  }
  if (!Array.isArray(document.replacements)) {
    throw new Error("semantic replacement ledger must contain replacements");
  }

  for (const field of [
    "schema_version",
    "artifact",
    "detection_rule",
    "migration_source",
    "legacy_function_count",
    "legacy_private_helper_count",
    "legacy_public_rpc_count",
  ]) {
    if (expected[field] !== actual[field]) {
      throw new Error(`opaque helper inventory metadata changed: ${field}`);
    }
  }

  const delta = describeInventoryDelta(expected, actual);
  if (delta.added.length > 0 || delta.removed.length > 0) {
    throw new Error("semantic replacement ledger cannot authorize added or removed legacy functions");
  }

  const approvals = new Map();
  for (const replacement of document.replacements) {
    if (!replacement || typeof replacement.key !== "string" || replacement.key.length === 0) {
      throw new Error("semantic replacement key is required");
    }
    if (approvals.has(replacement.key)) {
      throw new Error(`duplicate semantic replacement approval: ${replacement.key}`);
    }
    if (typeof replacement.reason !== "string" || replacement.reason.trim().length < 20) {
      throw new Error(`semantic replacement reason is incomplete: ${replacement.key}`);
    }
    if (typeof replacement.from_definition_path !== "string" || typeof replacement.to_definition_path !== "string") {
      throw new Error(`semantic replacement paths are required: ${replacement.key}`);
    }
    approvals.set(replacement.key, replacement);
  }

  const changedKeys = new Set();
  for (const change of delta.changed) {
    const approval = approvals.get(change.actual.key);
    if (!approval) {
      throw new Error(`unapproved opaque helper change: ${change.actual.key}`);
    }
    if (change.expected.definition_path !== approval.from_definition_path) {
      throw new Error(`semantic replacement source mismatch: ${change.actual.key}`);
    }
    if (change.actual.definition_path !== approval.to_definition_path) {
      throw new Error(`semantic replacement target mismatch: ${change.actual.key}`);
    }

    const allowedActual = {
      ...change.expected,
      definition_path: approval.to_definition_path,
    };
    if (stableJson(allowedActual) !== stableJson(change.actual)) {
      throw new Error(`semantic replacement changed more than definition_path: ${change.actual.key}`);
    }
    changedKeys.add(change.actual.key);
  }

  for (const key of approvals.keys()) {
    if (!changedKeys.has(key)) {
      throw new Error(`stale semantic replacement approval: ${key}`);
    }
  }

  return {
    approved_replacements: changedKeys.size,
    changed_keys: [...changedKeys].sort(),
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
    const replacements = JSON.parse(readFileSync(semanticReplacementsPath, "utf8"));
    try {
      const approval = validateApprovedSemanticReplacements(expected, inventory, replacements);
      console.log(
        `Opaque helper containment passed with ${approval.approved_replacements} explicit semantic replacement(s): ${approval.changed_keys.join(", ")}.`
      );
      return;
    } catch (error) {
      console.error("Opaque E14 helper inventory changed.");
      console.error(`Expected ${expected.legacy_function_count} legacy functions; found ${inventory.legacy_function_count}.`);
      console.error(stableJson(describeInventoryDelta(expected, inventory)).trim());
      console.error(error instanceof Error ? error.message : String(error));
      console.error("Only exact, documented semantic replacements may differ from the frozen baseline.");
      process.exit(1);
    }
  }

  const replacements = JSON.parse(readFileSync(semanticReplacementsPath, "utf8"));
  if (replacements.replacements.length > 0) {
    console.error("Semantic replacement ledger contains stale approvals while the frozen baseline matches exactly.");
    process.exit(1);
  }

  console.log(
    `Opaque helper containment passed: ${inventory.legacy_private_helper_count} private helpers and ${inventory.legacy_public_rpc_count} public RPCs remain frozen.`
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();

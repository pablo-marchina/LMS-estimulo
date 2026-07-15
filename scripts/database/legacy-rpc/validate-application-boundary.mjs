import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(currentDir, "../../..");
const rpcPath = resolve(repositoryRoot, "apps/web/lib/journey-runtime/rpc.ts");
const boundaryPath = resolve(repositoryRoot, "apps/web/lib/journey-runtime/legacy-rpc-arguments.ts");
const syntheticRuntimePath = resolve(repositoryRoot, "apps/web/lib/browser-e2e/synthetic-runtime.ts");
const contractPath = resolve(
  repositoryRoot,
  "docs/implementation/public-rpc-contracts-v1.json"
);

function walk(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const absolutePath = resolve(directory, entry);
    if (statSync(absolutePath).isDirectory()) return walk(absolutePath);
    return /\.(?:ts|tsx)$/.test(entry) ? [absolutePath] : [];
  });
}

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

const rpcSource = readFileSync(rpcPath, "utf8");
const boundarySource = readFileSync(boundaryPath, "utf8");
const syntheticRuntimeSource = readFileSync(syntheticRuntimePath, "utf8");
const contract = JSON.parse(readFileSync(contractPath, "utf8"));
const opaqueRpcs = contract.application_contract.opaque_database_argument_rpcs;
const methodToRpc = contract.application_contract.method_to_rpc;

if (opaqueRpcs.length !== 8) {
  fail(`Expected eight frozen opaque RPCs; found ${opaqueRpcs.length}.`);
}

if (!rpcSource.includes('from "@/lib/journey-runtime/legacy-rpc-arguments"')) {
  fail("rpc.ts must import the legacy RPC argument compatibility boundary.");
}

if (!boundarySource.includes("normalizeLegacyRpcArgumentsForSynthetic")) {
  fail("The compatibility boundary must own synthetic normalization of frozen aliases.");
}

if (!syntheticRuntimeSource.includes('import "server-only"')) {
  fail("The browser E2E synthetic runtime must remain server-only.");
}
if (!syntheticRuntimeSource.includes("browserE2EEnabled()")) {
  fail("The browser E2E synthetic runtime must remain behind the explicit local gate.");
}

const methods = [];
for (const rpcName of opaqueRpcs) {
  const method = Object.entries(methodToRpc).find(([, mappedRpc]) => mappedRpc === rpcName)?.[0];
  if (!method) {
    fail(`No application method is mapped to ${rpcName}.`);
    continue;
  }
  methods.push(method);

  if (!rpcSource.includes(`legacyRpcArguments.${method}(`)) {
    fail(`${method} must construct ${rpcName} arguments through legacyRpcArguments.`);
  }
  if (!boundarySource.includes(`${method}(`)) {
    fail(`Compatibility boundary is missing mapper ${method}.`);
  }
  if (!boundarySource.includes(`case "${rpcName}"`)) {
    fail(`Compatibility boundary is missing synthetic normalization for ${rpcName}.`);
  }
}

if (/^\s+[a-z]:\s/m.test(rpcSource)) {
  fail("rpc.ts contains a direct one-letter argument key outside the compatibility boundary.");
}

const applicationFiles = walk(resolve(repositoryRoot, "apps/web"));
for (const absolutePath of applicationFiles) {
  if (absolutePath === rpcPath || absolutePath === boundaryPath || absolutePath === syntheticRuntimePath) continue;
  const source = readFileSync(absolutePath, "utf8");
  for (const rpcName of opaqueRpcs) {
    if (source.includes(`"${rpcName}"`) || source.includes(`'${rpcName}'`)) {
      fail(
        `${relative(repositoryRoot, absolutePath)} references ${rpcName} outside the approved compatibility and test boundaries.`
      );
    }
  }
}

if (new Set(methods).size !== opaqueRpcs.length) {
  fail("Opaque RPC methods are not one-to-one with the frozen database surface.");
}

if (process.exitCode) process.exit(process.exitCode);
console.log(
  `Legacy RPC application boundary passed: ${opaqueRpcs.length} RPCs are isolated behind semantic mappers; synthetic normalization remains in the compatibility boundary and the browser adapter is server-only.`
);

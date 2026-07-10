import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(currentDir, "../../..");
const rpcPath = resolve(repositoryRoot, "apps/web/lib/journey-runtime/rpc.ts");
const boundaryPath = resolve(repositoryRoot, "apps/web/lib/journey-runtime/legacy-rpc-arguments.ts");
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
const contract = JSON.parse(readFileSync(contractPath, "utf8"));
const opaqueRpcs = contract.application_contract.opaque_database_argument_rpcs;
const methodToRpc = contract.application_contract.method_to_rpc;

if (opaqueRpcs.length !== 8) {
  fail(`Expected eight frozen opaque RPCs; found ${opaqueRpcs.length}.`);
}

if (!rpcSource.includes('from "@/lib/e14/legacy-rpc-arguments"')) {
  fail("rpc.ts must import the legacy RPC argument compatibility boundary.");
}

const methods = [];
for (const rpcName of opaqueRpcs) {
  const method = Object.entries(methodToRpc).find(([, mappedRpc]) => mappedRpc === rpcName)?.[0];
  if (!method) {
    fail(`No application method is mapped to ${rpcName}.`);
    continue;
  }
  methods.push(method);

  if (!rpcSource.includes(`legacyE14RpcArguments.${method}(`)) {
    fail(`${method} must construct ${rpcName} arguments through legacyE14RpcArguments.`);
  }
  if (!boundarySource.includes(`${method}(`)) {
    fail(`Compatibility boundary is missing mapper ${method}.`);
  }
}

if (/^\s+[a-z]:\s/m.test(rpcSource)) {
  fail("rpc.ts contains a direct one-letter argument key outside the compatibility boundary.");
}

const applicationFiles = walk(resolve(repositoryRoot, "apps/web"));
for (const absolutePath of applicationFiles) {
  if (absolutePath === rpcPath) continue;
  const source = readFileSync(absolutePath, "utf8");
  for (const rpcName of opaqueRpcs) {
    if (source.includes(`"${rpcName}"`) || source.includes(`'${rpcName}'`)) {
      fail(
        `${relative(repositoryRoot, absolutePath)} references ${rpcName} outside apps/web/lib/journey-runtime/rpc.ts.`
      );
    }
  }
}

if (new Set(methods).size !== opaqueRpcs.length) {
  fail("Opaque RPC methods are not one-to-one with the frozen database surface.");
}

if (process.exitCode) process.exit(process.exitCode);
console.log(
  `Legacy RPC application boundary passed: ${opaqueRpcs.length} RPCs are isolated behind semantic mappers.`
);

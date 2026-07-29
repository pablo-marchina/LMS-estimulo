import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const artifactDirectory = path.join(root, ".artifacts");

function command(commandName, args, fallback = "unknown") {
  try {
    return execFileSync(commandName, args, { cwd: root, encoding: "utf8" }).trim() || fallback;
  } catch {
    return fallback;
  }
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

async function fileDigest(relativePath) {
  const content = await readFile(path.join(root, relativePath));
  return { path: relativePath, sha256: sha256(content), bytes: content.byteLength };
}

const criticalFiles = [
  "package.json",
  "package-lock.json",
  ".npmrc",
  ".nvmrc",
  ".node-version",
  "Dockerfile.lambda",
  "apps/web/next.config.ts",
  "apps/web/proxy.ts",
  "apps/web/lib/rpc/authenticated-gateway.ts",
  "supabase/functions/authenticated-rpc/index.ts",
];
const criticalDigests = await Promise.all(criticalFiles.map(fileDigest));

const migrationNames = (await readdir(path.join(root, "supabase/migrations")))
  .filter((name) => /^\d{14}_[a-z0-9_]+\.sql$/u.test(name))
  .sort();
const migrationDigests = await Promise.all(
  migrationNames.map((name) => fileDigest(`supabase/migrations/${name}`)),
);
const migrationSetSha256 = sha256(
  migrationDigests.map((entry) => `${entry.path}\0${entry.sha256}`).join("\n"),
);

const commit = command("git", ["rev-parse", "HEAD"], process.env.GITHUB_SHA ?? "unknown");
const commitEpoch = command("git", ["show", "-s", "--format=%ct", commit], process.env.SOURCE_DATE_EPOCH ?? "0");
const generatedAt = Number(commitEpoch) > 0
  ? new Date(Number(commitEpoch) * 1_000).toISOString()
  : "1970-01-01T00:00:00.000Z";
const dirty = command("git", ["status", "--porcelain"], "").length > 0;
const imageArchiveShaPath = path.join(artifactDirectory, "lambda-image.sha256");
let imageArchiveSha256 = process.env.RELEASE_IMAGE_ARCHIVE_SHA256?.trim() || null;
try {
  imageArchiveSha256 ??= (await readFile(imageArchiveShaPath, "utf8")).trim().split(/\s+/u)[0] || null;
} catch {
  // The source-only manifest does not require a container archive.
}

const manifest = {
  schema_version: "1.0",
  artifact: "lms_estimulo_release_manifest",
  generated_at: generatedAt,
  source: {
    repository: process.env.GITHUB_REPOSITORY ?? "pablo-marchina/LMS-estimulo",
    commit,
    ref: process.env.GITHUB_REF ?? command("git", ["branch", "--show-current"]),
    dirty,
  },
  toolchain: {
    node: process.version,
    npm: command("npm", ["--version"]),
    platform: process.platform,
    architecture: process.arch,
  },
  source_integrity: {
    critical_files: criticalDigests,
    migration_count: migrationDigests.length,
    migration_set_sha256: migrationSetSha256,
  },
  container: {
    image_id: process.env.RELEASE_IMAGE_ID?.trim() || null,
    archive_sha256: imageArchiveSha256,
  },
};

await mkdir(artifactDirectory, { recursive: true });
const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
await writeFile(path.join(artifactDirectory, "release-manifest.json"), serialized, "utf8");
await writeFile(
  path.join(artifactDirectory, "release-manifest.sha256"),
  `${sha256(serialized)}  release-manifest.json\n`,
  "utf8",
);
process.stdout.write(serialized);
if (dirty) {
  process.stderr.write("release manifest generated from a dirty working tree\n");
  process.exitCode = 1;
}

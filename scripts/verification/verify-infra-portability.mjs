import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const envExample = await readFile(path.join(root, ".env.example"), "utf8");
const supabaseConfig = await readFile(path.join(root, "supabase/config.toml"), "utf8");

const requiredPortableVariables = [
  "NEXT_PUBLIC_APP_URL",
  "ADMIN_LOCAL_OAUTH_BRIDGE_ORIGIN",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

for (const name of requiredPortableVariables) {
  assert.match(envExample, new RegExp(`^${name}=`, "mu"), `.env.example must declare ${name}`);
}

assert.match(
  envExample,
  /^ADMIN_LOCAL_OAUTH_BRIDGE_ORIGIN=\s*$/mu,
  "ADMIN_LOCAL_OAUTH_BRIDGE_ORIGIN must stay environment-specific in .env.example",
);
assert.doesNotMatch(
  envExample,
  /https?:\/\/[^\s]+\.vercel\.app/iu,
  ".env.example must not pin a Vercel deployment hostname",
);
assert.doesNotMatch(
  supabaseConfig,
  /https?:\/\/[^\s\"]+\.vercel\.app/iu,
  "supabase/config.toml must not pin a hosted Vercel redirect; configure hosted Auth redirects in the target Supabase project",
);

process.stdout.write("[verify-infra-portability] passed\n");

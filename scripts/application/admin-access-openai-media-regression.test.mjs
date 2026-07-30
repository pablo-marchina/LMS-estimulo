import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const adminStart = await readFile("apps/web/app/auth/admin/start/route.ts", "utf8");
const adminCallback = await readFile("apps/web/app/auth/admin/callback/route.ts", "utf8");
const adminPage = await readFile("apps/web/app/entrar/administracao/page.tsx", "utf8");
const participantLogin = await readFile("apps/web/app/entrar/page.tsx", "utf8");
const participantLoginAction = await readFile("apps/web/app/entrar/actions.ts", "utf8");
const mediaViewer = await readFile("apps/web/components/content-asset-viewer.tsx", "utf8");
const nextConfig = await readFile("apps/web/next.config.ts", "utf8");
const migration = await readFile("supabase/migrations/20260730150000_openai_official_drive_videos.sql", "utf8");

test("administrative Google login is authorized by active RBAC instead of a duplicated domain gate", () => {
  assert.match(adminStart, /prompt:\s*"select_account"/u);
  assert.doesNotMatch(adminStart, /hd:\s*"estimulo\.org"/u);
  assert.match(adminCallback, /administrativeOrganization\(identity\)/u);
  assert.doesNotMatch(adminCallback, /isEstimuloAdministrativeEmail|dominio_invalido/u);
  assert.match(adminPage, /papel administrativo ativo/u);
  assert.match(adminPage, /Escolher conta Google/u);
  assert.match(participantLoginAction, /administrativeOrganization\(auth\.identity\)/u);
});

test("participant login presents signup and team access as distinct visual actions", () => {
  assert.match(participantLogin, /Ainda não tem conta\?/u);
  assert.match(participantLogin, /Criar minha conta/u);
  assert.match(participantLogin, /Equipe Estímulo/u);
  assert.match(participantLogin, /Acessar área administrativa/u);
  assert.match(participantLogin, /sm:grid-cols-2/u);
  assert.match(participantLogin, /bg-primary-soft\/55/u);
});

test("official OpenAI Drive videos are embedded safely and remain completable", () => {
  assert.match(mediaViewer, /function googleDriveEmbed/u);
  assert.match(mediaViewer, /drive\.google\.com\/file\/d\/\$\{encodeURIComponent\(id\)\}\/preview/u);
  assert.match(mediaViewer, /requiresManualCompletion/u);
  assert.match(nextConfig, /frame-src[^\n]*https:\/\/drive\.google\.com/u);
  assert.match(nextConfig, /script-src[^\n]*https:\/\/www\.youtube\.com/u);
});

test("OpenAI journey migration contains every unique official video and removes demo placeholders", () => {
  const videoRows = migration.match(/\('[0-9a-f-]{36}'::uuid,\s*\d,\s*'[^']+',\s*'[^']+',\s*'[^']+',\s*'[^']+'\)/gu) ?? [];
  const driveIds = [...migration.matchAll(/\('[0-9a-f-]{36}'::uuid,\s*\d,\s*'([^']+)'/gu)].map((match) => match[1]);
  assert.equal(videoRows.length, 24);
  assert.equal(new Set(driveIds).size, 24);
  assert.match(migration, /1JIU-6NZhNI84zUMxHgYal_i8nb7up4ET/u);
  assert.match(migration, /65b9b10a-2432-5f11-a999-b9ffbc7b7832/u);
  assert.match(migration, /6775693f-6edd-5581-aa43-302a3d043e0c/u);
  assert.match(migration, /OPENAI_OFFICIAL_VIDEO_COUNT_MISMATCH/u);
});

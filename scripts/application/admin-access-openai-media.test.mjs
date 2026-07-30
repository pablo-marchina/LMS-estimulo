import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const adminStart = await readFile("apps/web/app/auth/admin/start/route.ts", "utf8");
const adminCallback = await readFile("apps/web/app/auth/admin/callback/route.ts", "utf8");
const adminPage = await readFile("apps/web/app/entrar/administracao/page.tsx", "utf8");
const participantLogin = await readFile("apps/web/app/entrar/page.tsx", "utf8");
const mediaViewer = await readFile("apps/web/components/content-asset-viewer.tsx", "utf8");
const nextConfig = await readFile("apps/web/next.config.ts", "utf8");
const migration = await readFile("supabase/migrations/20260730150000_openai_official_drive_videos.sql", "utf8");

test("administrative Google login starts in one click and validates domain plus RBAC after OAuth", () => {
  assert.match(adminStart, /signInWithOAuth/u);
  assert.match(adminStart, /hd:\s*"estimulo\.org"/u);
  assert.match(adminStart, /prompt:\s*"select_account"/u);
  assert.doesNotMatch(adminStart, /client\.auth\.signOut/u);
  assert.doesNotMatch(adminStart, /requestedEmail/u);
  assert.doesNotMatch(adminStart, /login_hint/u);
  assert.match(adminCallback, /isEstimuloAdministrativeEmail\(user\.email\)/u);
  assert.match(adminCallback, /administrativeOrganization\(identity\)/u);
  assert.match(adminPage, /href="\/auth\/admin\/start"/u);
  assert.match(adminPage, /ButtonLink/u);
  assert.match(adminPage, /Continuar com Google/u);
  assert.doesNotMatch(adminPage, /<form[^>]+action="\/auth\/admin\/start"/u);
  assert.doesNotMatch(adminPage, /PendingSubmitButton/u);
  assert.doesNotMatch(adminPage, /name="email"/u);
});

test("participant login keeps signup visible and team access discreet in the footer", () => {
  assert.match(participantLogin, /Não tem conta\?/u);
  assert.match(participantLogin, /Criar minha conta/u);
  assert.match(participantLogin, /Sou da equipe Estímulo/u);
  assert.match(participantLogin, /Contas da equipe Estímulo entram exclusivamente pela área administrativa\./u);
  assert.match(participantLogin, /text-xs/u);
  assert.match(participantLogin, /border-t border-border\/70/u);
  assert.doesNotMatch(participantLogin, /sm:grid-cols-2/u);
  assert.doesNotMatch(participantLogin, /Acessar área administrativa/u);
  assert.doesNotMatch(participantLogin, /bg-primary-soft\/55/u);
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

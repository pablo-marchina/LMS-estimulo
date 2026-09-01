import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const adminStart = await readFile("apps/web/app/auth/admin/start/route.ts", "utf8");
const adminCallback = await readFile("apps/web/app/auth/admin/callback/route.ts", "utf8");
const adminPage = await readFile("apps/web/app/entrar/administracao/page.tsx", "utf8");
const participantLogin = await readFile("apps/web/app/entrar/page.tsx", "utf8");
const participantHome = await readFile("apps/web/app/empreendedor/page.tsx", "utf8");
const mediaViewer = await readFile("apps/web/components/content-asset-viewer.tsx", "utf8");
const nextConfig = await readFile("apps/web/next.config.ts", "utf8");
const migration = await readFile("supabase/migrations/20260730150000_openai_official_drive_videos.sql", "utf8");

test("administrative Google login starts in one click and validates Estimulo membership after OAuth", () => {
  assert.match(adminStart, /signInWithOAuth/u);
  assert.match(adminStart, /provider:\s*"google"/u);
  assert.match(adminStart, /prompt:\s*"select_account"/u);
  assert.doesNotMatch(adminStart, /hd:\s*"estimulo\.org"/u);
  assert.doesNotMatch(adminStart, /client\.auth\.signOut/u);
  assert.doesNotMatch(adminStart, /requestedEmail/u);
  assert.doesNotMatch(adminStart, /login_hint/u);
  assert.match(adminCallback, /auth\.getUser\(\)/u);
  assert.match(adminCallback, /function hasGoogleIdentity/u);
  assert.match(adminCallback, /identity\.provider\?\.trim\(\)\.toLowerCase\(\) === "google"/u);
  assert.match(adminCallback, /administrativeOrganization\(identity\)/u);
  assert.doesNotMatch(adminCallback, /auth\.getClaims\(\)|isGoogleAuthProvider|isEstimuloAdministrativeEmail/u);
  assert.match(adminPage, /href="\/auth\/admin\/start"/u);
  assert.match(adminPage, /ButtonLink/u);
  assert.match(adminPage, /Continuar com Google/u);
  assert.match(adminPage, /vínculo ativo com a Estímulo/u);
  assert.match(adminPage, /permissões concedidas por um administrador/u);
  assert.doesNotMatch(adminPage, /<form[^>]+action="\/auth\/admin\/start"/u);
  assert.doesNotMatch(adminPage, /PendingSubmitButton/u);
  assert.doesNotMatch(adminPage, /name="email"/u);
});

test("participant login keeps signup visible without advertising administrative access", () => {
  assert.match(participantLogin, /Não tem conta\?/u);
  assert.match(participantLogin, /Criar minha conta/u);
  assert.doesNotMatch(participantLogin, /Sou da equipe Estímulo/u);
  assert.doesNotMatch(participantLogin, /href="\/entrar\/administracao"/u);
  assert.doesNotMatch(participantLogin, /Acessar área administrativa/u);
  assert.doesNotMatch(participantLogin, /sm:grid-cols-2/u);
  assert.doesNotMatch(participantLogin, /bg-primary-soft\/55/u);
});

test("participant home can surface an eligible featured journey without treating that optional lookup as core data", () => {
  assert.match(participantHome, /journeyRuntime\.listEligibleJourneys/u);
  assert.match(participantHome, /const eligibleJourneys = fulfilled\(results\[1\]\) \?\? \[\]/u);
  assert.match(participantHome, /featuredEligible/u);
  assert.match(participantHome, /const coreDataUnavailable = results\[0\]\.status === "rejected" \|\| results\[3\]\.status === "rejected"/u);
  assert.doesNotMatch(participantHome, /coreDataUnavailable =[^\n]*results\[1\]/u);
});

test("official OpenAI Drive videos are embedded safely and complete through timed progress", () => {
  assert.match(mediaViewer, /function googleDriveEmbed/u);
  assert.match(mediaViewer, /drive\.google\.com\/file\/d\/\$\{encodeURIComponent\(id\)\}\/preview/u);
  assert.match(mediaViewer, /requiresTimedEmbedProgress/u);
  assert.match(mediaViewer, /document\.visibilityState !== "visible"/u);
  assert.match(mediaViewer, /watched \/ timedEmbedDuration >= 0\.9/u);
  assert.doesNotMatch(mediaViewer, /Concluí este conteúdo/u);
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

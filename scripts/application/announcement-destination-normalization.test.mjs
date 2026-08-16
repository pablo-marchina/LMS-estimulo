import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [route, carousel, migration, boundary] = await Promise.all([
  readFile("apps/web/app/api/announcement-banner-uploads/route.ts", "utf8"),
  readFile("apps/web/components/announcement-carousel.tsx", "utf8"),
  readFile("supabase/migrations/20260816190000_normalize_internal_announcement_destinations.sql", "utf8"),
  readFile("scripts/database/migration-history/active-release-boundary.mjs", "utf8"),
]);

test("announcement saves normalize configured application origins to relative paths", () => {
  assert.match(route, /function applicationOrigins\(request: NextRequest\): Set<string>/u);
  assert.match(route, /request\.nextUrl\.origin/u);
  assert.match(route, /process\.env\.NEXT_PUBLIC_APP_URL/u);
  assert.match(route, /process\.env\.ADMIN_LOCAL_OAUTH_BRIDGE_ORIGIN/u);
  assert.match(route, /applicationOrigins\(request\)\.has\(parsed\.origin\)/u);
  assert.match(route, /return `\$\{parsed\.pathname\}\$\{parsed\.search\}\$\{parsed\.hash\}`/u);
  assert.match(route, /validatedAnnouncementDestination\(nullable\(formData\.get\("cta_url"\)\), request\)/u);
});

test("announcement destination validation keeps private-instance and external-protocol protections", () => {
  assert.match(route, /ANNOUNCEMENT_PRIVATE_DESTINATION_NOT_ALLOWED/u);
  assert.match(route, /privateParticipantDestination\.test\(parsed\.pathname\)/u);
  assert.match(route, /parsed\.protocol !== "https:"/u);
  assert.ok(route.indexOf("applicationOrigins(request).has(parsed.origin)") < route.indexOf('parsed.protocol !== "https:"'));
});

test("legacy Vercel participant CTAs are normalized without touching unrelated origins", () => {
  assert.match(migration, /update engagement\.announcements/u);
  assert.match(migration, /\^https:\/\/lms-estimulo-web\\\.vercel\\\.app/u);
  assert.match(migration, /\/empreendedor/u);
  assert.doesNotMatch(migration, /where id\s*=/iu);
  assert.doesNotMatch(migration, /delete from engagement\.announcements/iu);
});

test("relative CTAs stay in the current environment at render time", () => {
  assert.match(carousel, /function isInternalHref\(value: string\)/u);
  assert.match(carousel, /<Link href=\{announcement\.cta_url\}/u);
});

test("announcement normalization remains inside the active migration boundary", () => {
  assert.match(boundary, /'20260816180000_reconcile_participant_navigation_registry\.sql'/u);
  assert.match(boundary, /'20260816190000_normalize_internal_announcement_destinations\.sql'/u);
  assert.match(boundary, /expectedLastMigration = '20260816220438_participant_shell_context\.sql'/u);
});

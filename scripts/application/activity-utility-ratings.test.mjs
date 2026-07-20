import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [migration, runtime, action, page] = await Promise.all([
  readFile("supabase/migrations/20260720184500_activity_utility_ratings.sql", "utf8"),
  readFile("apps/web/lib/utility-rating/runtime.ts", "utf8"),
  readFile("apps/web/app/actions/journey.ts", "utf8"),
  readFile("apps/web/app/empreendedor/atividade/[stepInstanceId]/page.tsx", "utf8"),
]);

test("utility rating stores append-only revisions and a current projection", () => {
  assert.match(migration, /activity_utility_rating_revisions/u);
  assert.match(migration, /activity_utility_ratings/u);
  assert.match(migration, /governance\.reject_mutation/u);
  assert.match(migration, /rating between 1 and 5/u);
  assert.match(migration, /learning\.activity\.utility\.rated/u);
});

test("utility rating is server-only, idempotent and not synchronized by default", () => {
  assert.match(runtime, /import "server-only"/u);
  assert.match(runtime, /rate_activity_utility/u);
  assert.match(action, /utilityRatingValue/u);
  assert.match(migration, /not_synced_pending_signal_catalog_approval/u);
  assert.match(migration, /'credit_use','forbidden'/u);
  assert.match(migration, /ACTIVITY_UTILITY_CONTENT_NOT_CONFIRMED/u);
  assert.match(migration, /revoke all on function public\.rate_activity_utility/u);
});

test("activity offers an accessible optional five-star rating after content", () => {
  assert.match(page, /canAssess \? <section/u);
  assert.match(page, /Escolha de 1 a 5 estrelas/u);
  assert.match(page, /\[1, 2, 3, 4, 5\]/u);
  assert.match(page, /não altera sua conclusão, seus pontos ou qualquer decisão de crédito/u);
  assert.match(page, /defaultChecked=\{utilityRating\.rating === rating\}/u);
});

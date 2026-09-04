import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [proxy, signupAction, completionAction, provisioning, publicSignupMigration] = await Promise.all([
  readFile("apps/web/proxy.ts", "utf8"),
  readFile("apps/web/app/cadastro/actions.ts", "utf8"),
  readFile("apps/web/app/cadastro/concluir/actions.ts", "utf8"),
  readFile("apps/web/lib/auth/public-signup-provisioning.ts", "utf8"),
  readFile("supabase/migrations/20260720181500_public_signup.sql", "utf8"),
]);

test("first-touch UTMs are captured directly without requiring an admin campaign", () => {
  assert.match(proxy, /hasUtmParameters\(request\.nextUrl\)/u);
  assert.match(proxy, /request\.cookies\.has\(FIRST_TOUCH_COOKIE\)/u);
  assert.match(proxy, /encodeFirstTouch\(firstTouchFromUrl\(request\.nextUrl\)\)/u);
  assert.doesNotMatch(proxy, /tracking_links/u);
});

test("signup persists attribution before the confirmation email can change browser or device", () => {
  assert.match(signupAction, /decodeFirstTouch\(cookieStore\.get\(FIRST_TOUCH_COOKIE\)\?\.value\)/u);
  assert.match(signupAction, /signup_first_touch_attribution:\s*firstTouchAttribution/u);
  assert.match(signupAction, /auth\.signUp/u);
  assert.doesNotMatch(signupAction, /tracking_links/u);
});

test("profile completion restores signup attribution before falling back to the browser cookie", () => {
  assert.match(completionAction, /firstTouchFromUnknown\(metadata\.signup_first_touch_attribution\)/u);
  assert.match(completionAction, /storedAttribution\s*\?\?\s*cookieAttribution/u);
  assert.match(completionAction, /signup_first_touch_attribution:\s*null/u);
  assert.doesNotMatch(completionAction, /tracking_links/u);
});

test("participant provisioning writes the supplied UTM fields into acquisition attributions", () => {
  assert.match(provisioning, /p_attribution:\s*input\.attribution/u);
  assert.match(publicSignupMigration, /insert into core\.acquisition_attributions/u);
  assert.match(publicSignupMigration, /utm_source,utm_medium,utm_campaign,utm_content,utm_term,landing_path/u);
  assert.match(publicSignupMigration, /p_attribution->>'utm_source'/u);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [
  privacyPage,
  termsPage,
  profilePage,
  announcementCarousel,
  engagementAdmin,
  participantCriticalVisual,
  signInPage,
  libraryPage,
] = await Promise.all([
  readFile("apps/web/app/privacidade/page.tsx", "utf8"),
  readFile("apps/web/app/termos/page.tsx", "utf8"),
  readFile("apps/web/app/empreendedor/perfil/page.tsx", "utf8"),
  readFile("apps/web/components/announcement-carousel.tsx", "utf8"),
  readFile("apps/web/app/admin/engajamento/page.tsx", "utf8"),
  readFile("scripts/e2e/participant-critical-flow-visual.mjs", "utf8"),
  readFile("apps/web/app/entrar/page.tsx", "utf8"),
  readFile("apps/web/components/participant-library-page.tsx", "utf8"),
]);

test("terms and privacy render the published legal versions used by signup", () => {
  assert.match(termsPage, /getPublicSignupLegalDocument\("terms_of_use", version\)/u);
  assert.match(privacyPage, /getPublicSignupLegalDocument\("privacy_policy", version\)/u);
  assert.match(privacyPage, /export const dynamic = "force-dynamic"/u);
  assert.match(privacyPage, /if \(!legalDocument\) notFound\(\)/u);
  assert.match(privacyPage, /Versão \$\{legalDocument\.version_number\}, publicada em \$\{publishedAt\}/u);
  assert.doesNotMatch(privacyPage, /Versão operacional de 29 de julho de 2026/u);
});

test("profile achievements navigation stays on the canonical profile route", () => {
  assert.match(profilePage, /href="\/empreendedor\/perfil\/conquistas"/u);
  assert.doesNotMatch(profilePage, /href="\/empreendedor\/conquistas"/u);
});

test("desktop announcements cannot exceed forty percent of the viewport and admins can remove them", () => {
  assert.match(announcementCarousel, /sm:min-h-0 sm:max-h-\[40vh\]/u);
  assert.match(engagementAdmin, /Excluir banner/u);
  assert.match(engagementAdmin, /retireAnnouncementAction/u);
  assert.match(engagementAdmin, /O histórico administrativo foi preservado/u);
});

test("critical participant visual validation can enter through a real eligible journey when needed", () => {
  assert.match(participantCriticalVisual, /form:has\(input\[name="journey_version_id"\]\)/u);
  assert.match(participantCriticalVisual, /eligible journey CTA is unavailable/u);
  assert.match(participantCriticalVisual, /no enrolled or eligible journey CTA found/u);
  assert.match(participantCriticalVisual, /\[data-inline-lesson\]/u);
  assert.match(participantCriticalVisual, /horizontal overflow/u);
  assert.match(participantCriticalVisual, /gap between/u);
  assert.match(participantCriticalVisual, /prompt\/content horizontal inset mismatch/u);
  assert.match(participantCriticalVisual, /repeated verification heading is still visible/u);
  assert.match(participantCriticalVisual, /embedded verification still renders a nested quick-check card/u);
});

test("final participant login copy and recovery affordance remain in place", () => {
  assert.match(signInPage, /title="Entrar"/u);
  assert.match(signInPage, /Use o e-mail e a senha que você cadastrou\./u);
  assert.match(signInPage, /Criar minha conta/u);
  assert.match(signInPage, /Sou da equipe Estímulo/u);
  assert.match(signInPage, /Esqueci minha senha/u);
});

test("library avoids exposing a generic moment filter while archetype taxonomy is not canonical", () => {
  assert.match(libraryPage, /level: null/u);
  assert.doesNotMatch(libraryPage, /name="momento"/u);
  assert.doesNotMatch(libraryPage, /name="nivel"/u);
});
